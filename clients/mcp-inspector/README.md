# MCP Inspector OAuth Client

The MCP inspector runs as a local web client that runs at `http://localhost:6274`.

## Usage

Execute the following script from the current folder.\
The code clones the code for the MCP inspector and runs its web client:

```bash
./run.sh
```

## Client Behavior

Wait for a few seconds and the MCP inspector opens in the browser.\
Configure the following properties in the browser frontend:

- **Transport Type**: Streamable HTTP
- **URL**: `https://mcp.demo.example/mcp`
- **Connection Type**: Direct 

Click the `Connect` button. This will trigger the initial OAuth flow. The client uses Dynamic Client Registration to register itself at the authorization server, then authenticates a user to get access to the MCP server.

Once the flow completes, you can list the available tools. When you use any tool that requires high-privilege tokens you will be prompted for additional authentication. The MCP server runs the HAAPI flow with the MCP client's initial access token to get a higher-privileged access token. The HAAPI flow requires the user to re-authenticate with a stronger credential — bank ID. Once you confirm authentication with your bank ID app, run the `continue_authorization` tool. After this tool completes, the higher-privileged token remains in the MCP server's memory and is tied to the user's session. This token is never revealed to the MCP client.

## Restarting Environment

The MCP Inspector runs a DCR flow to register itself at the authorization server, then stores the client data in session storage. Whenever you restart the environment you need to ensure that the inspector registers a new client at the authorization server. Make sure to clear your browser's session storage for the MCP inspector whenever you rebuild the environment.

## CORS

The MCP inspector calls the example deployment's endpoints directly from the browser.\
Therefore, the example deployment's API gateway must use a CORS plugin to grant access to the web client:

```yaml
- name: mcp-server-resource-metadata
  url: http://mcp-server:3000/.well-known/oauth-protected-resource
  routes:
  - name: mcp-server-resource-metadata-route
    hosts:
    - mcp.demo.example
    paths:
    - /.well-known/oauth-protected-resource
  plugins:
  - name: cors
    config:
      origins:
      - 'http://localhost:6274'
```
