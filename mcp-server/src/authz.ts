import { DPoPOAuthClient } from './oauth_client';
import config from '../config.json' with { type: 'json' };
import { bankIdAcr, htmlFormAcr, type Config } from './types/config';
import type { AccessTokenAuthenticatorView, BankdIDAuthenticatorView, HtmlFormAuthenticatorView, HaapiView } from './haapi_types';
import { haapiResponseView } from './haapi_utils';
import { haapiHeaders, ensureAbsoluteUrl } from './haapi_utils';
import { authenticateWithBankID, findQrCode } from './bankid';

const typedConfig = config as Config;

export type AuthorizationResult = { success: boolean; message: string; qrCode?: string }

async function configUsernameAndPassword(): Promise<{ username: string; password: string }> {
    return config.authn.userCredentials || (() => { throw new Error('User credentials not configured in config.json'); })();
}

/**
 * A test function to run the full HAAPI authentication flow.
 */
export async function callHaapi() {
    const client = await createAuthenticatedHaapiClient();
    if (typedConfig.authn.acr === htmlFormAcr) {
        // when running from the command line, use configured credentials.
        const token = await runHtmlFormAuthenticationFlow(client, () => configUsernameAndPassword());
        console.log('Obtained access token:', token);
    } else {
        const bankIDView = await runBankIDAuthenticationFlow(client);
        await authenticateWithBankID(client, bankIDView);
    }
}

async function createAuthenticatedHaapiClient(): Promise<DPoPOAuthClient> {
    const client = new DPoPOAuthClient();
    await client.authenticateClient(ensureAbsoluteUrl(typedConfig.oauth.tokenEndpoint), 'urn:se:curity:scopes:haapi');
    return client;
}

async function sendAuthorizationRequest(client: DPoPOAuthClient): Promise<Response> {
    // start OAuth authorization for the end user via HAAPI
    const url = new URL(ensureAbsoluteUrl(typedConfig.oauth.authorizationEndpoint));
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('client_id', process.env.HAAPI_CLIENT_ID || 'haapi-client');
    url.searchParams.append('redirect_uri', typedConfig.oauth.redirectUri);
    url.searchParams.append('scope', typedConfig.oauth.scope);
    url.searchParams.append('state', 'random-state-value');
    url.searchParams.append('acr', typedConfig.authn.acr);
    return client.get(url.toString(), haapiHeaders)
}

/**
 * Run the HAAPI authentication flow up to the BankID authenticator.
 * 
 * The Curity Server must be configured such that the BankID authenticator
 * has a pre-requisite authenticator of type "access_token" for this to work.
 *  
 * @param oauthClient optional OAuth client
 * @returns the initial BankID authenticator view (caller must poll until authentication is complete)
 */
export async function runBankIDAuthenticationFlow(oauthClient?: DPoPOAuthClient): Promise<BankdIDAuthenticatorView> {
    const client = oauthClient || await createAuthenticatedHaapiClient();
    const authResponse = await sendAuthorizationRequest(client);

    // Should get to the access_token authenticator view directly
    const accessTokenView = await haapiResponseView<AccessTokenAuthenticatorView>(
        authResponse,
        client);

    console.log('Access Token Authenticator response:', JSON.stringify(accessTokenView, null, 2));

    // submit the access token, expect the next authenticator to be BankID
    const bankIDView = await haapiResponseView<BankdIDAuthenticatorView>(
        await authenticateWithAccessTokenAuthenticator(client, accessTokenView),
        client
    );

    console.log('HAAPI BankID authenticator response:', JSON.stringify(bankIDView, null, 2));

    return bankIDView;
}

/**
 * Run the HAAPI authentication flow all the way to authentication based on a HTML Form Authenticator.
 * 
 * The Curity Server must be configured such that the HTML Form Authenticator
 * has a pre-requisite authenticator of type "access_token" for this to work.
 *  
 * @param oauthClient optional OAuth client
 * @returns the access token after successful authentication
 */
export async function runHtmlFormAuthenticationFlow(
    oauthClient?: DPoPOAuthClient,
    requestUserNameAndPassword: () => Promise<{ username: string; password: string }> = configUsernameAndPassword
): Promise<string> {
    const client = oauthClient || await createAuthenticatedHaapiClient();
    const authResponse = await sendAuthorizationRequest(client);

    // Should get to the access_token authenticator view directly
    const accessTokenView = await haapiResponseView<AccessTokenAuthenticatorView>(
        authResponse,
        client);

    console.log('Access Token Authenticator response:', JSON.stringify(accessTokenView, null, 2));

    // submit the access token, expect the next authenticator to be HTML Form
    const htmlFormView = await haapiResponseView<HtmlFormAuthenticatorView>(
        await authenticateWithAccessTokenAuthenticator(client, accessTokenView),
        client
    );

    console.log('HAAPI HTML Form authenticator response:', JSON.stringify(htmlFormView, null, 2));

    const postBackUrl = htmlFormView.actions.find(action => action.kind === 'login')?.model.href;
    if (!postBackUrl) {
        throw new Error('No login action found in HTML Form Authenticator view');
    }
    const finalView = await haapiResponseView<HaapiView>(
        await authenticateWithHtmlFormAuthenticator(client, postBackUrl,
            await requestUserNameAndPassword()),
        client
    );

    console.log('Final authenticator response:', JSON.stringify(finalView, null, 2));

    return ''; // TODO extract access token from finalView
    
}

async function authenticateWithAccessTokenAuthenticator(
    client: DPoPOAuthClient,
    accessTokenView: AccessTokenAuthenticatorView,
): Promise<Response> {
    return client.postForm(
        ensureAbsoluteUrl(accessTokenView.actions[0].model.href),
        {
            token: config.authn.backendAccessToken,
        },
        haapiHeaders
    );
}

async function authenticateWithHtmlFormAuthenticator(
    client: DPoPOAuthClient,
    url: string,
    credentials: { username: string; password: string }
): Promise<Response> {
    const response = client.postForm(
        ensureAbsoluteUrl(url),
        {
            userName: credentials.username,
            password: credentials.password,
        },
        haapiHeaders
    );
    return response;
}

/**
 * 
 * This is the tool function the LLM will call when it needs to obtain authorization.
 * 
 * @param onToken callback to receive the obtained token. May be called much later than the function returns, or before.
 * @returns an object indicating success or failure, and the QR code if successful
 */
export async function obtainAuthorization(onToken: (token: string) => void): Promise<AuthorizationResult> {
    const acr = typedConfig.authn.acr;
    if (acr === bankIdAcr) {
        return authorizeWithBankID();
    } else if (acr === htmlFormAcr) {
        return authorizeWithHtmlSql(onToken);
    }
    return {
        success: false,
        message: `Unsupported authentication method: ${acr}`,
    };
}

async function authorizeWithBankID(): Promise<AuthorizationResult> {
    try {
        const bankIDView = await runBankIDAuthenticationFlow();
        const qrCode = findQrCode(bankIDView);

        return {
            success: true,
            message: `Authentication almost done! Please scan the QR code to finish the authorization process.`,
            qrCode: qrCode,
        };
    } catch (error) {
        console.error('Error generating QR code:', error);
        return {
            success: false,
            message: 'Authorization failed. Please try again later.',
        };
    }
}

async function authorizeWithHtmlSql(onToken: (token: string) => void): Promise<AuthorizationResult> {
    throw new Error('HTML SQL authorization not implemented yet');
}
