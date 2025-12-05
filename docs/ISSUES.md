# Issues and Ideas

Here are some thoughts with ideas for improvement as well as some issues the widget still has.

- **Initial portfolio state**. The widget gets recreated with every new message to chatGPT. The Apps documentation states that the widget's instance is tied to a concrete message ID. We can use any tool by asking chatGPT to run (e.g. "buy me 10 more AAPL stocks") and it will properly run the `buy_stock` tool, but the widget will not display, because it won't have the initial portfolio list. (You can see some messages printed out from the widget about the current widgetState and toolOutput). This also means, that if I don't have a high-privilege token yet, and I ask chatGPT to buy stock, it will fail. It might show me the QR code, but the widget code responsible for polling will not run. This should be fixed, so that the widget should be able to run regardless of whether we have the portfolio list or not.

- **mcp-server needs two clients** — Currently, the MCP server needs to be represented by two separate clients in the Curity Identity Server. This is because a HAAPI client can't run token exchange.

- **Use ChatGPT styles** — there is a UI SDK from OPenAI (https://openai.github.io/apps-sdk-ui/?path=/docs/overview-introduction--docs). We could use it to create the widget using OpenAI's official styles and components.

- **bank ID identity** — when you authenticate with the bankID, currently the flow does not verify the identity. There is no link between the logged-in user and the user that authenticates with bankID. I think that the user's account should have the SSN and then match it with the one it gets from the bankID authentication.

- **signing consentor** — use a signing consentor instead of the bankID authenticator. Have the user sign a concrete transaction (buyin/selling stocks).

- **OIDC authenticator instead of AT authenticator?** — Currently, we use the access token authenticator to ensure that the HAAPI flow is run for the user logged in to the MCP server. We were thinking whether we could use OIDC instead for this purpose. I think it's not possible, because an MCP client does not send an ID token to the MCP server (as expected).

## Troubleshooting

- If you get some strange errors from chatGPT, like problems with loading the widget, or connecting to the MCP server, then delete the App and create a new one. Some things that get cached by chatGPT, and it is currently the only way to refresh. This is also needed when you want chatGPT to register a new client at the Curity Identity Server.

- Ngrok's dashboard can give a lot of helpful insights into the requests that are sent to the MCP server and Curity Identity Server. You can find it here: http://localhost:4040/inspect/http This can sometimes help understand what is going on.

- The widget prints out some stuff to the browser's console. You can check what happens with the widget's state using that.

