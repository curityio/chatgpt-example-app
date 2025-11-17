- Updating the plugin
- running local MCP Server


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

The [mcp-server/config.json](mcp-server/config.json) config file can be used to configure the following:

* `apiUrl`: the API server's base URL.
* `oauth`:
    * `tokenEndpoint`: the authorization server's token endpoint full URL.
    * `authorizationEndpoint`: the authorization server's authorization endpoint full URL.
    * `scope`: the scope to request when the MCP server initiates the HAAPI authentication flow.
    * `redirectUri`: the HAAPI client's redirect URI.
* `authn`:
    * `serverBaseUrl`: the Authentication Server's base URL.
    * `acr`: the Authenticator's ACR to use. See details below.
    * `backendAccessToken`: an access token that is assumed to be obtained by a MCP Client.
      Used by the MCP server to start authentication via the [access_token plugin](https://github.com/curityio/access-token-authenticator).
    * `userCredentials`: (FOR CLI TESTING PURPOSES ONLY)
        * `username`: username to authenticate with when using the HTML Form Authenticator.
        * `password`: password to authenticate with when using the HTML Form Authenticator.

> to run the MCP server using stdio transport, use `npm run start:stdio -w mcp-server`.

It is possible to initiate a HAAPI authentication flow from the terminal by running `npm run haapi`.

TODO: instead of configuring `backendAccessToken`, we should let the MCP client actually run OAuth and obtain a real token
to talk to the MCP Server. Currently, the MCP server maintains an unauthenticated session for each user, hence the need
to configure the access token beforehand.

For the HAAPI client to authenticate, credentials must be provided via environment variables,
see the [.env.example](mcp-server/.env.example) file for which environment variables are required.

#### ACR

The Curity Identity Server needs to be configured with the `access_token` authenticator as a pre-requisite of the _main_ authenticator.
That is used because before starting strong user authentication via HAAPI, we need to ensure the current user has authenticated against the
MCP Server itself (which they do via the MCP Client, normally).

Once the token is validated (the authenticator can validate audience, issuer, purpose),
the HAAPI client will arrive at the _main_ authenticator, which should be one of the following:

* **BankID**: set the `acr` to `urn:se:curity:authentication:bankid:bankid1`.
* **HTML Form**: set the `acr` to `urn:se:curity:authentication:html-form:htmlFormJson`.

> If using HTML Form, running `npm run haapi` requires setting `authn.userName` and `authn.password`.

In the case of the BankID authenticator, the MCP Server will return a QR code to the MCP client which allows them to authenticate.

In the case of the HTML Form authenticator, the MCP Server sends an _elicitation_ to the MCP client, asking the user for username and password.

TODO: currently, when using BankID, we start authentication and only poll once. We do not refresh the QR code either, since that would require
sending multiple messages back to the MCP Client which would just show new images to the user every time, instead of replace the previous one.
Also, we could try to just obtain consent with BankID by asking it to sign a particular transaction instead of just authenticating.
That would allow us to obtain a prefix-scope for the particular transaction, backed by a BankID signature.
Many possibilities!
