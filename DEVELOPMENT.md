# Local MCP Server and API Development

These notes explain how to run API components locally, with other components in Docker.\
Before running the `./deploy.sh` script, override API URLs:

```bash
export MCP_SERVER_INTERNAL_URL=http://host.docker.internal:8081
export PORTFOLIO_API_INTERNAL_URL=http://localhost:8080
```

Use the following commands to run the local MCP server on port 8081:

```shell
cd mcp-server
npm run build
node --env-file=.env dist/index.js
```

Use the following commands to run the local Portfolio API on port 8080:

```bash
cd portfolio-api
npm install
npm start
```

Then deploy the system according to [Deployment README](DEPLOYMENT.md).

## Test the HAAPI Flow

You can test the MCP server's HAAPI authentication flow without ChatGPT.\
To do so, run the following command in another terminal window:

```bash
cd mcp-server
npm run haapi
```
