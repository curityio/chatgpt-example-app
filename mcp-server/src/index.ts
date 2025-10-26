import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import path from 'path';
import { z } from 'zod';

const server = new McpServer({ name: 'todo-server', version: '1.0.0' });

const apiUrl = 'http://localhost:8080/api/todos';

server.registerTool(
  'get_todos',
  { 
    title: 'Get Todos',
    description: 'Returns the full list of todos.',
    outputSchema: { result: z.string() }
  },
  async () => {
    const response = await fetch(apiUrl);
    if (response.status !== 200) {
      throw new Error('Failed to fetch todos');
    }
    const todos = await response.json();
    const output = { result: JSON.stringify(todos) };
    return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output };
  },
);

const app = express();
app.use(express.json());

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
