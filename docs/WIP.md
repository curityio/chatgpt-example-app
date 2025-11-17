**NOTE**: ChatGPT apps are not yet available in the EU. For that reason, this project simulates a ChagGPT App using only local servers.

* web - the frontend of the Todo App
* chat-gpt-app - ChatGPT App Simulator (necessary while the real ChatGPT Apps are not available in the EU)


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

TODO: this is only useful when embedded by the chat-gpt-app, see below.

### chat-gpt-app

```
npm run dev -w chatgpt-app
```

TODO: this was added to allow iframing the web frontend inside a simulated Chat App - the way ChatGPT will apparently do with its new widgets.
However, it's not currently doing anything much since implementing elicitation support for the HTML Form, or image prompting in case of BankID,
would require more work without currenlty giving much value since we can make any MCP Client work with the current MCP Server anyway.
