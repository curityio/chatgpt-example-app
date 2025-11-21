# Working with the Code

Here you will find some tips and information that can help you run components of this project locally, outside of Docker. This can be helpful when making changes to the code to see quick results.

## Running the MCP Server Locally

You can run the MCP server on a development computer, instead of the Docker container. To do that, follow these steps.

1. Update `mcp-server/.env` to contain your environments configuration.
2. Update `apigateway/kong.yml` to route to the local MCP server (there are two lines that need to be uncommented, they are properly marked in the file)
3. Build and start the MCP server:

```shell
cd mcp-server
npm run build
node --env-file=.env dist/index.js

```

4. Build and start the rest of the environment:

```shell
./build.sh
./deploy.sh
```

## Updating the Authenticator Plugin

The Curity Identity Server uses an access token authenticator to properly authenticate HAAPI requests. The first time you build the project, the sbuild scripts downloads the code for the plugin into idsvr/plugins/access-token-authenticator. If the code for the plugin is updated in the remote repo, make sure to update it by running `git pull`, or simply delete the `plugins` folder and rebuild the project.

## Running Todo API

To run the API locally, use these commands:

```
cd todo-api
npm i
npm run dev
```

The API Server allows configuring CORS in [api-server/config.json](api-server/config.json)

Make sure to udpate `apigateway/kong.yml` to point to the local instance of the API, if this is needed.

## MCP Server Configuration

The following settings can be configured using environment variables

- `PORT` - port on which the MCP server is started. If you change this setting, make sure to also change `apigateway/kong.yml` to point to the correct port.
- `HAAPI_CLIENT_ID` and `HAAPI_CLIENT_PASSWORD` — credentials of the OAuth client that performs the HAAPI flow.
- `EXTERNAL_BASE_URL` — the external base URL of the MCP server
- `API_URL` — the base URL of the API. This could be an internal or external URL depending on where you deploy the MCP server. 
- `AUTHORIZATION_SERVER_BASE_URL` — the base external URL of the authorization server
- `TOKEN_ENDPOINT` — the authorization server's token endpoint URL. This could be an internal or external URL depending on where you deploy the MCP server.
- `AUTHORIZATION_ENDPOINT` — the authorization server's authorization endpoint URL. This could be an internal or external URL depending on where you deploy the MCP server.
- `SCOPE` — the scope that the MCP client will receive in its' access tokens and for which the MCP server will ask when running the HAAPI flow.
- `REDIRECT_URI` — the redirect URI that the MCP server has registered at the authorization server. This URL is not used to make any redirects, but needs to match the URI registered in the authorization server.
- `AUTHN_SERVER_BASE_URL` — the base URL for the HAAPI flow. This could be an internal or external URL depending on where you deploy the MCP server.
- `EXTERNAL_AUTHN_SERVER_BASE_URL` — the external base URL for the HAAPI flow. The external URL is used in DPoP tokens.
- `ACR` — the authentication method that should be used in the HAAPI flow. See below.

### Authentication Method

The Curity Identity Server needs to be configured with the `access_token` authenticator as a pre-requisite of the _main_ authenticator.
That is used because before starting strong user authentication via HAAPI, we need to ensure the current user has authenticated against the
MCP Server itself (which they do via the MCP Client, normally).

Once the token is validated (the authenticator can validate audience, issuer, purpose),
the HAAPI client will arrive at the _main_ authenticator, which should be one of the following:

* **BankID**: set the `ACR` to `urn:se:curity:authentication:bankid:bank-id`.
* **HTML Form**: set the `ACR` to `urn:se:curity:authentication:html-form:htmlFormJson`.
* **Email magic link**: set the `ACR` to `urn:se:curity:email:email-for-mcp`

In the case of the BankID authenticator, the MCP Server will return a QR code to the MCP client which allows them to authenticate.

In the case of the HTML Form authenticator, the MCP Server sends an _elicitation_ to the MCP client, asking the user for username and password.

**NOTE** Currently, when using BankID, we do not refresh the QR code, since that would require sending multiple image message back to the MCP Client. The clients don't yet support swapping images in responses, so this will be a poor UX.

## Other Modes

You can run the MCP server using stdio transport. Use:

```shell
cd mcp-server
npm run start:stdio
```

For testing, you can initiate a HAAPI authentication flow from the terminal by running `npm run haapi` from the `mcp-server` folder.

When using HTML Form, you will also need to set the following environment variables: `USERNAME` and `PASSWORD`.
