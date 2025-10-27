import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import path from 'path';
import { z } from 'zod';
import { getTodos, setTodoCompletion } from './api_calls';

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
    outputSchema: { result: z.string() }
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

const app = express();
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

const port = 8081;
app.listen(port, () => {
  console.log(`MCP endpoint available at http://localhost:${port}/mcp`);
});
