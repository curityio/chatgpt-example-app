# Example ChatGPT App (Todo app)

ChatGPT apps are not yet available in the EU. For that reason,
this project simulates a ChagGPT App using only local servers.

* api-server - the Todo API
* mcp-server - MCP Server (exposes the Todo API as LLM tools and serves the web frontend)
* web - the frontend of the Todo App
* chat-gpt-app - ChatGPT App Simulator (necessary while the real ChatGPT Apps are not available in the EU)

A real application would only require the `mcp-server` and the `web` frontend.

The API is assumed to already exist as a separate project, and to be protected by OAuth.

## Installing Dependencies

```
npm i --workspaces
```

## Running

### api-server

```
npm run dev -w api-server
```

The API Server allows configuring CORS in [api-server/config.json](api-server/config.json)

### mcp-server

```
npm run dev -w mcp-server
```

To debug the MCP Server, use the MCP Inspector:

```
npx @modelcontextprotocol/inspector
```

The MCP Server calls the API Server. Its URL can be configured in
[mcp-server/config.json](mcp-server/config.json).

> to run the MCP server using stdio transport, use `npm run start:stdio -w mcp-server`.

### web

The frontend is served by the mcp-server (as it would in a real ChatGPT app as a MCP Resource).

To watch its resources and automatically re-build on changes:

```
npm run watch -w web
```

For development, it can also run standalone with a dev server:

```
npm start -w web
```

By default, the frontend will make requests to the api-server (configure the API base URL
in [web/config.json](web/config.json)).

To use a mock implementation instead (i.e. make no HTTP requests, use test data), run:

```
npm run start:test -w web
```

### chat-gpt-app

```
npm run dev -w chatgpt-app
```
