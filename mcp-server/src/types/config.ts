export const bankIdAcr = 'urn:se:curity:authentication:bankid:bank-id';
export const htmlFormAcr = 'urn:se:curity:authentication:html-form:htmlFormJson';

export interface Config {

  apiUrl: string;
  oauth: {
    tokenEndpoint: string;
    authorizationEndpoint: string;
    scope: string;
    redirectUri: string;
  };
  authn: {
    // The ACR of the authenticator to be used - the HAAPI client expects to get directly to it,
    // with the access_token authenticator being a pre-requisite for it.
    acr: typeof bankIdAcr | typeof htmlFormAcr;

    // The base URL of the Authentication Server (Curity) used in the HAAPI flows.
    serverBaseUrl: string;

    // Normally, the end user would obtain an access token to talk to the MCP Server.
    // However, for testing purposes, we configure one here that can be used by the
    // MCP Server to authenticate the end user before letting them get to the
    // BankID authenticator.
    backendAccessToken: string;

    // Optional user credentials for HTML Form authentication (used only when being tested via the command line)
    userCredentials?: {
      username: string;
      password: string;
    };
  };

}
