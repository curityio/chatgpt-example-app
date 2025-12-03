# Issues and Ideas

Here are some thoughts with ideas for improvement as well as some issues the widget still has.

- **Initial portfolio state**. The widget gets recreated with every new message to chatGPT. The Apps documentation states that the widget's instance is tied to a concrete message ID. We can use any tool by asking chatGPT to run (e.g. "buy me 10 more AAPL stocks") and it will properly run the `buy_stock` tool, but the widget will not display, because it won't have the initial portfolio list. (You can see some messages printed out from the widget about the current widgetState and toolOutput). This also means, that if I don't have a high-privilege token yet, and I ask chatGPT to buy stock, it will fail. It might show me the QR code, but the widget code responsible for polling will not run. This should be fixed, so that the widget should be able to run regardless of whether we have the portfolio list or not.

- **mcp-server needs two clients** — Currently, the MCP server needs to be represented by two separate clients in the Curity Identity Server. This is because a HAAPI client can't run token exchange.

- **bank ID identity** — when you authenticate with the bankID, currently the flow does not verify the identity. There is no link between the logged-in user and the user that authenticates with bankID. I think that the user's account should have the SSN and then match it with the one it gets from the bankID authentication.

- **signing consentor** — use a signing consentor instead of the bankID authenticator. Have the user sign a concrete transaction (buyin/selling stocks).

- **development certs** — Currently, there are some certificates pushed to the repo that are used in the development setup. The chatGPT app version of the demo needs ngrok to run, so the certs are practically only used for mail.demo.example, api.demo.example, and admin.demo.example. Still, the certs are valid for a year, so eventually the demo will stop working. Instead of having the certs in the repo, the build step should generate them. There is a script for generating certs, and we use similar approach in other repos (e.g. here: https://github.com/curityio/mcp-authorization-secured-api/blob/main/deploy.sh)

- **Idea**: The QR code from Bank ID could be shown in a separate dialog.

- **OIDC authenticator instead of AT authenticator?** — Currently, we use the access token authenticator to ensure that the HAAPI flow is run for the user logged in to the MCP server. We were thinking whether we could use OIDC instead for this purpose. I think it's not possible, because an MCP client does not send an ID token to the MCP server (as expected).
