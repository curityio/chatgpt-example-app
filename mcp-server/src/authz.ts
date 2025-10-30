import { DPoPOAuthClient } from './oauth_client';
import config from '../config.json' with { type: 'json' };
import type { Config } from './types/config';
import type { AccessTokenAuthenticatorView, BankdIDAuthenticatorView } from './haapi_types';
import { haapiResponseView } from './haapi_utils';
import { haapiHeaders } from './haapi_utils';
import { authenticateWithBankID, findQrCode } from './bankid';

const typedConfig = config as Config;

/**
 * A test function to run the full HAAPI authentication flow.
 */
export async function callHaapi() {
    const client = await createAuthenticatedHaapiClient();
    const bankIDView = await runAuthenticationFlow(client);
    await authenticateWithBankID(client, bankIDView);
}

async function createAuthenticatedHaapiClient(): Promise<DPoPOAuthClient> {
    const client = new DPoPOAuthClient();
    await client.authenticateClient(typedConfig.oauth.tokenEndpoint, 'urn:se:curity:scopes:haapi');
    return client;
}

async function sendAuthorizationRequest(client: DPoPOAuthClient): Promise<Response> {
    // start OAuth authorization for the end user via HAAPI
    const url = new URL(typedConfig.oauth.authorizationEndpoint);
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
export async function runAuthenticationFlow(oauthClient?: DPoPOAuthClient): Promise<BankdIDAuthenticatorView> {
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

async function authenticateWithAccessTokenAuthenticator(
    client: DPoPOAuthClient,
    accessTokenView: AccessTokenAuthenticatorView,
): Promise<Response> {
    return client.postForm(
        accessTokenView.actions[0].model.href,
        {
            token: config.authn.backendAccessToken,
        },
        haapiHeaders
    );
}

/**
 * 
 * This is the tool function the LLM will call when it needs to obtain authorization.
 * 
 * @returns an object indicating success or failure, and the QR code if successful
 */
export async function obtainAuthorization(): Promise<{ success: boolean; message: string; qrCode?: string }> {
    try {
        const bankIDView = await runAuthenticationFlow();
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
