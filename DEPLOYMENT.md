# Deployment

These notes explain how to deploy and test the MCP server.

## Prerequisites

You need the following tools on your computer in order to run the deployment.\
The ngrok tool exposes the MCP server and the Curity Identity Server to the internet.\
ChatGPT can then connect to components running on the local computer.

- Docker
- Node.js 22+
- Maven
- ngrok
- curl
- jq
- envsubst

You also need the following free resources:

- An [ngrok account and auth token](https://dashboard.ngrok.com/get-started/your-authtoken)
- A [trial license for the Curity Identity Server](https://developer.curity.io/) with access to the HAAPI feature

## Build the code

First, build the project files by running the following command:

```shell
./build.sh
```

## Deploy Backend Components

Then, start all the Docker containers by running the following commands.\
Supply an ngrok auth token and the path to your Curity Identity Server license file.

```shell
export NGROK_TOKEN=1oLFIAYu7ZS0lD5S....
export LICENSE_FILE_PATH=~/Desktop/license-trial.json
./deploy.sh
```

The deployment outputs the URL of a secured MCP server:

```text
Use the following MCP Server URL to connect: https://815faa4bc463.ngrok-free.app/mcp
```

Later, once you've finished testing, run this command to free all Docker resources:

```shell
./teardown.sh
```

## Configure ChatGPT

Log in to ChatGPT's web interface with a paid account that has access to **Developer Mode**.\
In ChatGPT's web interface, go to **Settings** -> **Apps and Connectors** -> **Advanced** and enable **Developer Mode**.\
Use the MCP server URL to create a new App from the **Apps and Connectors** panel:

![ChatGPT Register](images/chatgpt-register.jpg)

Then, select the MCP server as an application

![ChatGPT App](images/chatgpt-app.jpg)

## Use Test Clients

You can also use the following test clients to gain better visibility into MCP requests:

- [TypeScript SDK Example Client](clients/typescript-sdk/run.sh)
- [MCP Inspector](clients/mcp-inspector/run.sh)

## Handle Redeployments

If you restart the Curity Identity Server container, update any tools, tool descriptions, templates, or assets you need to delete the application from chatGPT and create a new one. This will force a new client registration from ChatGPT. There is a "Refresh" button on in the Apps settings panel, which might refresh some of this data. If you run to connectivity issues it might be sometimes necessary to reconnect the app. You can do it from the **Apps and Connectors** panel.
