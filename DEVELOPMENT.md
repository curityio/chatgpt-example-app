# Local MCP Server and API Development

These notes explain how to run API components locally, with other components in Docker.\
First, run the [Deployment](DEPLOYMENT.md) to ensure that you meet prerequisites.

## Configure Local Computer URLs

Override URLs so that the API gateway of the deployed system routes to the local computer:

```bash
export MCP_SERVER_INTERNAL_URL=http://host.docker.internal:8081
export PORTFOLIO_API_INTERNAL_URL=http://localhost:8080
```

## Run the MCP Server and APIs

Use the following commands to run the local MCP server on port 8081:

```shell
cd mcp-server
npm install
npm start
```

Use the following commands to run the local Portfolio API on port 8080:

```bash
cd portfolio-api
npm install
npm start
```

Then re-run the `./deploy.sh` script to deploy the system with a local development routing.\
You can change the MCP server and API code with hot reloading and re-run the end-to-end flow.

## Test the HAAPI Flow

You can test the MCP server's HAAPI authentication flow without ChatGPT.\
To do so, run the following commands in another terminal window.\
Supply a test initial access token to supply to the access token authenticator:

```bash
cd mcp-server
export HAAPI_TEST_ACCESS_TOKEN=''
npm run haapi
```
