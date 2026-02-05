# ChatGPT App with MCP Step-Up Authentication

[![Quality](https://img.shields.io/badge/quality-demo-red)](https://curity.io/resources/code-examples/status/)
[![Availability](https://img.shields.io/badge/availability-source-blue)](https://curity.io/resources/code-examples/status/)

An example that shows how a ChatGPT widget can securely call APIs with human-in-the-loop approval.\
The Hypermedia Authentication API enables step-up authentication and lodging consent with a simple user experience.

## Running the Demo

See [DEPLOYMENT.md](DEPLOYMENT.md) to check how to deploy the demo's components on a local computer, and how to configure the app in ChatGPT. As part of this configuration, you will need to log a user in, as described below.

## Initial User Login Flow

ChatGPT's MCP client first triggers user authentication. USe the test user email: `john.doe@demo.example`.\
The Curity Identity Server will send a one-time code to a test email inbox. Open `http://localhost:1080` to view the inbox.\
Next, consent to ChatGPT's level of data access. As a result, ChatGPT receives a low privilege access token.

<img src="images/chatgpt-consent.jpg" alt="User Consent" style="width:50%; margin: auto; display: block;" />

You can then start the conversation with the chatbot. For example, try:

- `Curity Portfolio App what's my portfolio`
- `Curity Portfolio App I'm worried about nvidia being in a bubble. Check how many of their stock I have in my portfolio and sell all of it.`

When you start prompts with the name of your app, it gives ChatGPT clearer intention that it should use its tools. It is not required, but can give more accurate results.

You should see both a text response from the chatbot and a rendering of the app's widget. The widget will show different views, depending on your prompt. For example, it should show something similar to the following, if you ask for your portfolio.

![ChatGPT View](images/chatgpt-view.jpg)

## Lodging Intent and Step-Up Authentication Flow 

When you ask ChatGPT to buy or sell stocks, either through the widget's UI, or by asking the bot in a conversation, 
the MCP server will need to acquire a high-privilege token, which cryptographically confirms the user's intent.

In an overview, the flow looks similar to this:

![Overview of an end-to-end flow implemented by this example](images/end-to-end-overview.png?v=1)

The tool triggers a server side API-driven authentication flow using the Hypermedia Authentication API to obtain a signed consent for the given transaction. The tool returns BankID's QR code to the widget, and the widget is responsible for polling the MCP server to check for completion. The widget is also responsible for displaying a refreshed QR code (also known as an animated QR code). The user uses the BankID to sign an approval of the transaction. The widget then commits the transaction and renders an updated balance.

![ChatGPT BankID Approval](images/chatgpt-bankid.jpg)

The MCP server's HAAPI flow gets a high privilege access token that never leaves the backend environment.\
First, an [Access Token Authenticator](https://github.com/curityio/access-token-authenticator) sets the authenticated subject from the low privilege access token.\
Next, BankID captures human approval before the Curity Identity Server issues the high privilege access token.\
The MCP server then calls the Portfolio API with the high privilege access token to complete the transaction.

![Backend Token Flow](images/token-flow.png?v=2)

## View Security Configuration

Run the Admin UI for the Curity Identity Server to view the OAuth security settings:

- URL: `http://localhost:6749/admin`
- Username: `admin`
- Password: `Password1`

## Further Information

See the following resources for further information and tutorials:

- See the [Deployment README](DEPLOYMENT.md) to learn how to run the example and test end-to-end.
- See the [Development README](DEVELOPMENT.md) to learn how to run the MCP server code locally.
- See the [Secure an OpenAI ChatGPT App](https://curity.io/resources/learn/chatgpt-widget-haapi) for a tutorial that explains this code's security flow in depth.
- See the [Access Token Authenticator Plugin](https://github.com/curityio/access-token-authenticator) to learn how to use an access token as an authentication factor.
- Please visit [curity.io](https://curity.io/) for more information about the Curity Identity Server.
