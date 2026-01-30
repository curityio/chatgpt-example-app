# Adapt the Flow

This README explains approaches to adapt the deployment to meet other use cases.

## Change Deployment URLs

In a real deployment you could replace ngrok external base URLs from the [deploy.sh](../deploy.sh) script with your preferred values.\
Similarly, you can use a global search an replace on the repository's file, e.g. to change port 8081 to port 3001.

## Change Step-Up Configuration

The example deployment uses an OAuth client with the following components to implement financial-grade step-up:

- The Curity Identity Server runs step-up with the Access Token Authenticator and the BankID Signing Consentor.

In lower security use cases you might use HTML Form (passwords) for the initial login and then email for step-up authentication:

- The Curity Identity Server would then run step-up with the Access Token Authenticator and the Email Authenticator.

This folder's `curity-scenario-config-template.xml` file configures that alternative flow.\
The test user account `john.doe@demo.example` can sign in with a password of `Password1`.

You could copy `curity-scenario-config-template.xml` to the `idsvr` folder, to overwrite the BankID-specific configuration.\
Then, you could re-run the `./deploy.sh` script and re-test the flow in ChatGPT.
