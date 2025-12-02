# Example ChatGPT App (Portfolio app)

[![Quality](https://img.shields.io/badge/quality-demo-red)](https://curity.io/resources/code-examples/status/)
[![Availability](https://img.shields.io/badge/availability-source-blue)](https://curity.io/resources/code-examples/status/)

An example that shows how an AI application can securely call APIs with elevated permissions and human-in-the-loop.

## Prerequisites

You need the following tools on your computer in order to run the example:

- maven
- docker
- node and npm (node, at least v22)

By default, the MCP server and the Curity Identity Server get exposed to the internet via ngrok. This is required to connect to let chatGPT connect to the servers. To properly run this functionality, ensure you have the following installed on your computer:
- ngrok,
- curl,
- jq,
- envsubst

You will also need an ngrok auth token (https://dashboard.ngrok.com/get-started/your-authtoken) set in NGROK_TOKEN env variable.

If you don't want to use NGROK, update the `USE_NGROK` variable to `0` in `build.sh`.

You also need a valid license to run the Curity Identity Server. Make sure you have the license file locally and point the `LICENSE_FILE_PATH` environment variable to it. For example:

```shell
export LICENSE_FILE_PATH=/license/license.json
```

## Overview

The example consists of the following components:

- **MCP Server** — an OAuth-protected MCP server, that is capable of exchanging access tokens using HAAPI, and implements tools for calling the Portfolio API.
- **The Curity Identity Server** — serves as the authorization server which protects both access to the MCP Server and to the APIs. It is also responsible for authenticating users.
- **Portfolio API** — a simple API to manage a user's stocks portfolio. It exposes endpoints for listing the stocks, buying and selling. The API is protected with OAuth access tokens.
- **API Gateway** — the Kong API gateway is used for the phantom token flow — it exchanges opaque access tokens handled by the MCP client into JWTs required by the MCP server.

The following diagram shows an overview of an end-to-end flow implemented in this example:

![Overview of an end-to-end flow implemented by this example](docs/end-to-end-overview.png)

## Running the Example

Follow these steps to run the example:

1. Add the following line into your local `/etc/hosts` file (or equivalent for your operating system):

```
127.0.0.1 api.demo.example mcp.demo.example admin.demo.example login.demo.example mail.demo.example
```

2. Make sure the `LICENSE_FILE_PATH` environment variable points to a license for the Curity Identity Server. For example:

```shell
export LICENSE_FILE_PATH=/license/license.json
```

3. Build the project files by running the following command from the project's root directory:

```shell
./build.sh
```
4. Start all the Docker containers by running the following command from the project's root directory:

```shell
./deploy.sh
```

Once you're finished working with the project, use the following command from the project's root directory to free up resources:

```shell
./teardown.sh
```

## Testing the End to End Flow

To test the complete flow, you need to use a compatible MCP client. See the options below for instructions on how to use some popular clients.

The initial setup comes with a pre-registered user account. Use `john.doe@demo.example` whenever prompted for an email. The email authenticator will send a one-time-password to the user's email. This example uses a local maildev server to catch all outgoing emails. Navigate to `https://mail.demo.example` to access the dev inbox. You will see all the OTP emails there.

You can register other users and log in as them. The Portfolio API checks authorization and requires the user `john.doe@demo.example`, so you will see authorization errors when calling the tools with other users' tokens.

### Test the ChatGPT App

To test the app directly in chatGPT you need to enable developer mode. Any paid account should have access to developer mode, but if you are part of an organization you might need Admin rights or special permissions.

In chatGPT web interface go to **Settings** -> **Apps and Connectors** -> **Advanced**. Enable **Developer Mode**. You can then create a new App from the **Apps and Connectors** panel. Give it a name and description and point it to the ngrok domain you got when building the app with `/mcp` path, e.g. `https://615a015ea5f3.ngrok-free.app/mcp`.

![A filled in form for creating a new app in chat GPT](/docs/chat-gpt-create-app.png)

When you connect the app you should be redirected to the Curity Identity Server to log in. Use the instructions above to log in with the pre-configured user. Once the app connects you should see a list of the tools offered by the MCP server. You can then prompt chatGPT to list your portfolio, or buy or sell the stocks you have. You should also see the widget. If you struggle with chatGPT to run your tools you can start the prompt with the name of your app. This will instruct the LLM to use your app in this prompt.

If you restart the Curity Identity Server container, update any tools, tool descriptions, templates, or assets you need to delete the application from chatGPT and create a new one. This will force a new client registration from chatGPT. There is a "Refresh" button on in the Apps settings panel, which might refresh some of this data.

If you run to connectivity issues it might be sometimes necessary to reconnect the app. You can do it from the **Apps and Connectors** panel.

### Test with MCP Inspector

The simplest way is to test the solution with the MCP inspector tool. See the [MCP Inspector readme](clients/mcp-inspector/README.md) for details of installing and running the tool.

### Test with Claude Desktop

// TODO

## Development

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for details on how to work with the code locally.

## Work In Progress

See the [Work In Progress](docs/WIP.md) document to read about components that are in progress.
