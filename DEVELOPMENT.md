# Local Development

These notes explain how to run API components locally, with other components in Docker.\
First, run the [Deployment](DEPLOYMENT.md) to ensure that you meet prerequisites.

## Configure Local Computer URLs

Override URLs so that the API gateway of the deployed system routes to the local computer.\
Then re-run the deployment with a local development routing:

```bash
export MCP_SERVER_INTERNAL_URL=http://host.docker.internal:8081
export PORTFOLIO_API_INTERNAL_URL=http://localhost:8080
./deploy.sh
```

## Run the MCP Server and API

First, run the Portfolio API on port 8080:

```bash
cd portfolio-api
npm start
```

In another terminal window, run the MCP server in development mode on port 8081:

```shell
export NODE_ENV='development'
cd mcp/server
npm start
```

In another terminal window, build the widget in watch mode:

```shell
cd mcp/web
npm run watch
```

Then use a test client, like [MCPJam Inspector](https://github.com/MCPJam/inspector), that can render widget apps.
