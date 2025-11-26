import {McpServer, ResourceTemplate} from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express, { Request, Response } from 'express';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { getTodos, setTodoCompletion } from './api_calls';
import {Session, SessionManager} from './session-manager';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { obtainAuthorization } from './authz';
import Configuration from "./configuration";
import {AuthInfo} from '@modelcontextprotocol/sdk/server/auth/types.js';
import {DPoPOAuthClient} from "./oauth_client";
import {readFileSync} from "node:fs";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TODO remove this line when running against a real https URL!
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const checkMark = 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAABSlJREFUeF7tnUty1DAQhqUjhAtAFVeAXaqS2bDLFeAYsCIZVnAMuEJ2bDKpyo5cIVVwAXIEQzvWPGKPH1Kr3W39sxkSj1vt//ske5wh8a7nUVXVebP5snkOX/fthm3zJ7Bxzt1SG977q752fNfGBjxBB/D5YXJ0sD4mQkuABv4Nx6iooS6BlggHAlRVRctFWO7VdY+GWBI4kGArAOCzhGulyMp7T9cJbl+Aykr36JMlgVqCWgDMfpZArRXZeO9XQQDMfmv4ePpdecx+niSNVoEARsFxtb2hFYDe8+OGD1ekturUAuD8bwsaa7cQgDVOe8UggD1mrB1DANY47RWDAPaYsXYMAVjjtFcMAthjxtoxBGCN014xCGCPGWvHEIA1TnvFIIA9ZqwdQwDWOO0VgwD2mLF2DAFY47RXDALYY8baMQRgjdNeMQhgjxlrxxCANU57xSCAPWasHUMA1jjtFYMA9pixdgwBWOO0VwwC2GPG2jEEYI1zWrG7xz/u20P9izzc3d/f7tPrs/rfH5vnadXiXg0B4nJL3ovAf23gPy9GIkhJAAGSUU4vcHH/o57xfQ8pCSDAdH5Je4yBHwa4fvvBnZ68TBpvaGcIMJQQ4/Yp8GnY0xev3PWb94wdtEtBgKzx7opPhQ8BhMBIDBMDP/T1+O5z1haxAmSN17kU+BIXghAgowAp8KktCJARTu7SFuBTBlgBMpiQCl/i6j8cNgRgFsASfKwAhcOHAIwCWJv5OAUAfp0ArgESRbA687ECJIKn3a3DxwqQIMES4EOASAGWAh8CRAiwJPgQYKIAS4MPASYIsET4EGCkAEuFDwFGCLBk+OICaPgc/Ajm25csHb6oAFo+Bz9WgBLgiwnQBz8AkfwZ+JAEpcAXEWAMfE0SlARfnQDU0JwrQWnwRQQ4+fllaMVtbZ9DghLhiwgQG6ykBLE9ajp1TZ5lzQ7ZPw+QEq6EBCn9zX3KioW+v192Aei9/8Wv79G95pSgdPgipwAaZMo7gS5TckgA+E9JZ18BAlBNgWvqJXppZNpRTADqV0PwGnpgYsdSRlSAuSUA/LYz4gLMJQHgdy8YswggLQHgHz9bzCaAlASA33+pMKsAuSUA/OHrxNkFyCUB4A/DF70PMNQOJzDOWkN9W9+uYgXgvFlEtYZ+CWMftBx3HTVLokoAjtNBStilwVd1CtgHl7qEx0hQIny1AkivBKXCVy2AlAQlw1cvQG4JSodvQoBcEgD+05WSuncBxy7gOC8MAX+XshkBuFYCwD+cYqYESJUA8NvrqzkBYiUA/O6Tq0kBpkoA+MdvjZkVYKwEgN9/X9S0AHRofR85B/zhm+LmBQgS0DP9J5TwoL+7l/svbg3Hq/8VixBAf8x6O4QAetmIdAYBRGLWOwgE0MtGpDMIIBKz3kEggF42Ip1BAJGY9Q4CAfSyEekMAojErHcQCKCXjUhnEEAkZr2DQAC9bEQ6gwAiMesdBALoZSPSGQQQiVnvIBBALxuRziCASMx6B4EAetmIdAYBRGLWOwgE0MtGpDMIIBKz3kEggF42Ip1BAJGY9Q4CAfSyEekMAojErHcQEuDGOXeut0V0ljGBDQTImK6B0msSgGY/rQJ4lJcABCiP+e6IPT3oS1wHFKnB+j/+qyAATgOFORAmfy1AswpAgnIkqGc/He5WgEYC+uZlOTkUeaRb+C0BIMHihVh57zf7R3mwAuxvqKoKq8FyfCDoNPMP4HeuAM+PuRGBvn2GO4ZmjAig1zXkDvDhSP4BcLDmrm+X+ucAAAAASUVORK5CYII=';

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

async function onElicitationUserNameAndPasswordRequired(): Promise<{ username: string; password: string }> {
  console.log('Eliciting user credentials for authorization...');
  const result = await server.server.elicitInput({
    message: 'Please provide your credentials to proceed with authorization.',
    requestedSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Your username' },
        password: { type: 'string', description: 'Your password' },
      },
      required: ['username', 'password'],
    }
  });
  if (result.action === 'accept') {
    const username = result.content!.username as string;
    const password = result.content!.password as string;
    return { username, password };
  } else {
    throw new Error('User cancelled credential elicitation');
  }
}

async function getAccessToken(session: Session, receivedAccessToken: string) {

    const token = session?.token;

    if (token) {
        console.log('>>> Using token from session: ' + token)
        return token;
    }

    const client = new DPoPOAuthClient();
    const tokenResponse = await client.exchangeToken(receivedAccessToken);

    console.log('>>> Setting new access token in session');
    session.token = tokenResponse.access_token;

    return tokenResponse.access_token;
}

async function requestAuthorization(receivedAccessToken: string, session: Session): Promise<CallToolResult> {
    // TODO The new authorization request should ideally take scope information from the 403 response from API.
    const output = await obtainAuthorization(
        receivedAccessToken,
        (token) => {
            console.log('>>> Setting new token in session: ' + token);
            session.token = token
        },
        onElicitationUserNameAndPasswordRequired);
    if (output.success) {
        const structuredContent = {
            result: [], // Empty todo list
            authMessage: {
                message: output.message,
                qrcode: output.qrCode
            }
        };
        return {
            // The structuredContent should be exactly the same as the unstructured content
            // according to https://modelcontextprotocol.io/specification/2025-06-18/server/tools#structured-content
            // We do not include the image in the output the LLM will see, to avoid bloating the LLM context.
            content: [
                { type: 'text', annotations: { audience: ['user'] }, text: JSON.stringify(structuredContent) },
                { type: 'image', data: output.qrCode || checkMark, mimeType: 'image/png', annotations: { audience: ['user']} },
                { type: 'text', annotations: { audience: ['assistant'] }, text: 'Show the user the response from this tool and ask them to confirm when they approved authorization. Once the user approves, run the initial tool again.'}
            ],
            structuredContent,
        };
    }
    const structuredContent = { success: false, result: [], authMessage: { message: output.message, qrCode: null }};
    return {
        content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
        structuredContent,
    };
}

server.registerTool(
  'get_todos',
  {
    title: 'Get Todos',
    description: 'Returns the full list of todos.',
    // outputSchema: { result: z.string() } // TODO — this should be set properly
    _meta: {
        "openai/outputTemplate": "ui://widget/todo-widget.html",
        "openai/toolInvocation/invoking": "Checking your todos...",
        "openai/toolInvocation/invoked": "Todo list ready",
    },
  },
  async (context) => {
      const receivedAccessToken = context.authInfo?.token || '';
      const session = sessionManager.getOrCreateSession(context.sessionId);
      const token = await getAccessToken(session, receivedAccessToken);

      return getTodos(token);
  },
);

server.registerTool(
  'complete_todo',
  {
    description: 'Sets the completion status of a todo item to true.',
    inputSchema: {
      id: z.string(),
    },
    // outputSchema: { result: z.any() }
    _meta: {
        "openai/outputTemplate": "ui://widget/todo-widget.html",
        "openai/toolInvocation/invoking": "Completing a todo...",
        "openai/toolInvocation/invoked": "Completing a todo done.",
    },
  },
  async (input, context) => {
      const receivedAccessToken = context.authInfo?.token || '';
      const session = sessionManager.getOrCreateSession(context.sessionId);
      const token = await getAccessToken(session, receivedAccessToken);

        console.log(`Completing todo ${input.id} for session ${session.id}`);
        const completionResponse = await setTodoCompletion(input.id, true, token);

        if (completionResponse.isError) {
            return await requestAuthorization(receivedAccessToken, session);
        }

        return completionResponse;
    },
);

server.registerTool(
  'uncomplete_todo',
  {
    description: 'Sets the completion status of a todo item to false.',
    inputSchema: {
      id: z.string(),
    },
    // outputSchema: { result: z.string() }
    _meta: {
        "openai/outputTemplate": "ui://widget/todo-widget.html",
        "openai/toolInvocation/invoking": "Uncompleting a todo...",
        "openai/toolInvocation/invoked": "Uncompleting a todo done.",
    },
  },
  async (input, context) => {
      const receivedAccessToken = context.authInfo?.token || '';
      const session = sessionManager.getOrCreateSession(context.sessionId);
      const token = await getAccessToken(session, receivedAccessToken);

      console.log(`Uncompleting todo ${input.id} for session ${session.id}`);
      const completionResponse = await setTodoCompletion(input.id, false, token);

      if (completionResponse.isError) {
          return await requestAuthorization(receivedAccessToken, session);
      }

      return completionResponse;
  },
);

const widgetAppBundle = readFileSync("dist/web/bundle.js", "utf8");
const css = readFileSync("dist/web/app.css", "utf8");

server.registerResource(
    "todo-widget",
    "ui://widget/todo-widget.html",
    {},
    async () => ({
        contents: [
            {
                uri: "ui://widget/todo-widget.html",
                mimeType: "text/html+skybridge",
                text: `
<div id="root"></div>
<style>${css}</style>
<script type="module">${widgetAppBundle}</script>
        `.trim(),
                _meta: {
                    "openai/widgetPrefersBorder": true,
                },
            },
        ],
    })
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

    /*
     * The MCP server makes the access token available to tools that call upstream APIs
     */
      const setAuthInfo = (request: Request) => {

          let accessToken = '';

          const authorizationHeader = request.header('authorization');
          if (authorizationHeader) {
              const parts = authorizationHeader.split(' ');
              if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
                  accessToken = parts[1];
              }
          }

        const authInfo: AuthInfo = {
            token: accessToken,
            clientId: '',
            scopes: [],
        };
        (request as any).auth = authInfo;
    }

  app.post('/mcp', async (req, res) => {

      setAuthInfo(req);
      if (!(req as any).auth?.token) {

          return res
              .status(401)
              .header('Content-Type', 'application/json')
              .header('WWW-Authenticate', `Bearer error="invalid_token", error_description="Missing, invalid or expired access token", resource_metadata="${config.externalBaseUrl}/.well-known/oauth-protected-resource", scope="read"`)
              .send({'error': 'invalid_token', 'code': 'invalid_token', message: 'Missing, invalid or expired access token'})
      }

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

    /*
     * The MCP server returns its resource information and points clients to its authorization server
     * Some example clients require a resource identifier that ends with a trailing backslash
     * Return the scopes_supported that some MCP clients use in their scope selection strategy
     * - https://modelcontextprotocol.io/specification/draft/basic/authorization#scope-selection-strategy
     */
      const handleGetResourceMetadata = async (request: Request, response: Response)=> {

          const config = new Configuration();
        const metadata = {
            resource: `${config.externalBaseUrl}/`,
            resource_name: 'MCP Server',
            authorization_servers: [config.authorizationServerBaseUrl],
            scopes_supported: [config.scopeSupported],
        };

        response.setHeader('content-type', 'application/json');
        response.status(200).send(JSON.stringify(metadata));
    }

  // Handle GET requests for server-to-client notifications via SSE
  app.get('/mcp', handleSessionRequest);

  // Handle DELETE requests for session termination
  app.delete('/mcp', handleSessionRequest);

  // Handle protected resource metadata
  app.get('/.well-known/oauth-protected-resource', handleGetResourceMetadata);

  // Run with HTTP transport (default behavior)
    const config = new Configuration();
    const port = config.port;

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
