# Adapt the Deployment

This README explains approaches to adapt the deployment to meet other use cases.

## Change Deployment URLs

In a real deployment you could replace ngrok external base URLs from the [deploy.sh](../deploy.sh) script with your preferred values.\
Similarly, you can use a global search an replace on the repository's file, e.g. to change port 8081 to port 3001.

## Change Step-Up Configuration

The example deployment uses an OAuth client with the following components to implement financial-grade step-up:

- The Curity Identity Server runs step-up with the Access Token Authenticator and the BankID Signing Consentor.

In lower security use cases you might use HTML Form (passwords) for the initial login and then email for step-up authentication:

- The Curity Identity Server would then run step-up with the Access Token Authenticator and the Email Authenticator.

This folder's `curity-scenario-config-template.xml` file configures HTML Form initial login with email step up.

### Update the MCP Server Code

To make the flow work you would need to make the following code refinements to the MCP server:

- TODO

### Update the MCP Widget Code

To make the flow work you would need to make the following code refinements to the MCP widget:

- TODO

### Test the Updated Step-Up Flow

Copy `curity-scenario-config-template.xml` to the `idsvr` folder, to overwrite the BankID-specific configuration.\
Then rebuild and redeploy:

```bash
./build.sh
./deploy.sh
```

You can then test the updated flow in ChatGPT and sign in with these details:

- User: `john.doe@demo.example`
- Password: `Password1`
