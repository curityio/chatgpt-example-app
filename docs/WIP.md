# Work In Progress

The `work-in-progress` folder contains components which are not yet fully developed and might not work properly:

- `web` contains a simple frontend that a ChatGPT widget can use.
- `chatgpt-app` contains a mock of chatGPT frontend for testing the widget.

### web

The frontend is served by the mcp-server (as it would in a real ChatGPT app as a MCP Resource).

To watch its resources and automatically re-build on changes:

```
cd work-in-progress/web
npm i
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
cd work-in-progress/web
npm i
npm run start:test
```

This frontend is only useful when embedded by the chat-gpt-app.

### chat-gpt-app

```
cd work-in-progress/chatgpt-app
npm i
npm run dev
```

TODO: this was added to allow iframing the web frontend inside a simulated Chat App - the way ChatGPT will apparently do with its new widgets.
However, it's not currently doing anything much since implementing elicitation support for the HTML Form, or image prompting in case of BankID,
would require more work without currenlty giving much value since we can make any MCP Client work with the current MCP Server anyway.
