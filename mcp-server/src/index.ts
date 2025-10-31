import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { getTodos, setTodoCompletion } from './api_calls';
import { SessionManager, Session } from './session-manager';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { obtainAuthorization } from './authz';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TODO remove this line when running against a real https URL!
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Initialize session manager
const sessionManager = new SessionManager({
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  maxSessions: 100,
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
});

function missingAuthorizationResponse(): CallToolResult {
  const errorResult = {
      result: 'Authorization required. Please call obtain_authorization first.',
    };
  return {
    content: [{ type: 'text', text: JSON.stringify(errorResult) }],
    structuredContent: errorResult,
    isError: true
  };
}

const server = new McpServer({ name: 'todo-server', version: '1.0.0' });

server.registerTool(
  'get_todos',
  {
    title: 'Get Todos',
    description: 'Returns the full list of todos.',
    outputSchema: { result: z.string() }
  },
  async (input, context) => {
    // const session = getOrCreateSession(context);
    // console.log(`Getting todos for session ${session.id}`);
    return getTodos();
  },
);

server.registerTool(
  'complete_todo',
  {
    description: 'Sets the completion status of a todo item to true.',
    inputSchema: {
      id: z.string(),
    },
    outputSchema: { result: z.any() }
  },
  async (input, context) => {
    const session = sessionManager.getOrCreateSession(context.sessionId);
    const token = session?.token;
    if (!token) {
      return missingAuthorizationResponse();
    }
    console.log(`Completing todo ${input.id} for session ${session.id}`);
    return setTodoCompletion(input.id, true, token);
  },
);

server.registerTool(
  'uncomplete_todo',
  {
    description: 'Sets the completion status of a todo item to false.',
    inputSchema: {
      id: z.string(),
    },
    outputSchema: { result: z.string() }
  },
  async (input, context) => {
    const session = sessionManager.getOrCreateSession(context.sessionId);
    const token = session?.token;
    if (!token) {
      return missingAuthorizationResponse();
    }
    console.log(`Uncompleting todo ${input.id} for session ${session.id}`);
    return setTodoCompletion(input.id, false, token);
  },
);

server.registerTool(
  'obtain_authorization',
  {
    title: 'Obtain Authorization.',
    description: 'Obtains authorization to perform sensitive API calls. ' +
      'This is required before calling any tool that modifies data.',
    outputSchema: { success: z.boolean(), message: z.string() }
  },
  async (input, context) => {
    const session = sessionManager.getOrCreateSession(context?.sessionId);
    const output = await obtainAuthorization();
    if (output.success && output.qrCode) {
      const structuredContent = { success: true, message: output.message };
      return {
        // The structuredContent should be exactly the same as the unstructured content
        // according to https://modelcontextprotocol.io/specification/2025-06-18/server/tools#structured-content
        // We do not include the image in the output the LLM will see, to avoid bloating the LLM context.
        content: [
          { type: 'text', text: JSON.stringify(structuredContent) },
          { type: 'image', data: output.qrCode, mimeType: 'image/png' }
        ],
        structuredContent,
      };
    }
    const structuredContent = { success: false, message: output.message };
    return {
      content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
      structuredContent,
    };
  },
);

// Check if stdio transport is requested via command line argument
const useStdio = process.argv.includes('--stdio');

if (useStdio) {
  // Run with stdio transport
  console.error('Starting MCP server with stdio transport...');
  const transport = new StdioServerTransport();
  server.connect(transport).catch((error) => {
    console.error('Failed to start stdio transport:', error);
    process.exit(1);
  });
} else {
  const app = express();
  app.use(morgan('combined'));
  app.use(express.json());

  // Serve static files from the web directory
  app.use(express.static(path.join(__dirname, '../../web')));

  // Serve index.html for the root path and any unmatched routes (SPA support)
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../web/index.html'));
  });

  // Map to store transports by session ID
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => sessionManager.createSession().id,
        onsessioninitialized: (sessionId) => {
          console.log(`Session initialized: ${sessionId}`);
          transports[sessionId] = transport;
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) {
          console.log(`Session closed: ${transport.sessionId}`);
          delete transports[transport.sessionId];
          sessionManager.deleteSession(transport.sessionId);
        }
      };
      await server.connect(transport);
    }
    await transport.handleRequest(req, res, req.body);
  });

  // Reusable handler for GET and DELETE requests
  const handleSessionRequest = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  };

  // Handle GET requests for server-to-client notifications via SSE
  app.get('/mcp', handleSessionRequest);

  // Handle DELETE requests for session termination
  app.delete('/mcp', handleSessionRequest);

  // Run with HTTP transport (default behavior)
  const port = 8081;
  app.listen(port, () => {
    console.log(`MCP endpoint available at http://localhost:${port}/mcp`);
  });
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  sessionManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  sessionManager.shutdown();
  process.exit(0);
});
