# Adapt the Flow

This README explains approaches to adapt the deployment to meet other use cases.

## HTTPS URLs

In a real deployment you could replace ngrok external base URLs from the [deploy.sh](../deploy.sh) script with your preferred values.\
Similarly, you can use a global search an replace on the repository's file, e.g. to change port 8081 to port 3001.

## Use a Step-Up Authenticator

The example deployment uses an OAuth client with the following components to implement financial-grade step-up:

- The Curity Identity Server runs the Access Token Authenticator and then the BankID Signing Consentor.

In lower security use cases you could use a multi-factor authentication approach instead.\
For example, you could use SMS for step-up authentication, to send a text message to the user's phone:

- The Curity Identity Server runs the Access Token Authenticator and then the SMS Authenticator.

## Configure SMS for Step-Up Authentication

To demonstrate the SMS example, edit this folder's `curity-scenario-config-template.xml` file and configure SMS provider details.\
The following example uses the Twilio provider explained in [SMS docs](https://curity.io/docs/idsvr/latest/authentication-service-admin-guide/authenticators/sms-otp.html).

```xml
<sms-provider>
  <id>sms</id>
  <twilio>
    <from-number>MyTestAccount</from-number>
    <account-sid>my-account-id</account-sid>
    <auth-token>my-auth-token</auth-token>
  </twilio>
</sms-provider>
```

Then, copy the `curity-scenario-config-template.xml` file to the `idsvr` folder, to replace the BankID-specific configuration.\
Then, edit the test user accounts at the end of the `data-backup.sql` file to set a phone number for testing:

```sql
COPY accounts (account_id, username, password, email, phone ...
670bfc34-6788-11ed-9323-a269d5800c4d	john.doe@demo.example	+441111111111	...
```

## Adapt the MCP Server to use SMS Step Up

TODO - provide code snippets

## Test SMS Step-Up

Then re-run the deployment:

```bash
./deploy.sh
```

Finally, you can run the ChatGPT flow to use SMS step-up before allowing the transaction to complete.
