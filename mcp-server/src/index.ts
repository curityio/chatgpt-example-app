import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { z } from 'zod';
import { getTodos, setTodoCompletion } from './api_calls';
import { obtainAuthorization } from './authz';

const server = new McpServer({ name: 'todo-server', version: '1.0.0' });

server.registerTool(
  'get_todos',
  {
    title: 'Get Todos',
    description: 'Returns the full list of todos.',
    outputSchema: { result: z.string() }
  },
  async () => {
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
  async (input) => {
    return setTodoCompletion(input.id, true);
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
  async (input) => {
    return setTodoCompletion(input.id, false);
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
  async () => {
    const output = await obtainAuthorization();
    if (output.success && output.qrCode) {
      return {
        content: [
          { type: 'text', text: output.message },
          { type: 'image', data: output.qrCode.substring('data:image/png;base64,'.length), mimeType: 'image/png' }
        ],
        structuredContent: { success: true, message: output.message },
      };
    }
    return {
      content: [{ type: 'text', text: output.message }],
      structuredContent: { success: false, message: output.message },
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

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => {
      transport.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Run with HTTP transport (default behavior)
  const port = 8081;
  app.listen(port, () => {
    console.log(`MCP endpoint available at http://localhost:${port}/mcp`);
  });
}
