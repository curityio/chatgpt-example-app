/*
 *  Copyright 2025 Curity AB
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {DPoPOAuthClient} from './dpopOAuthClient.js';
import type {AccessTokenAuthenticatorView, BankdIDAuthenticatorView} from './haapiTypes.js';
import {haapiHeaders, haapiResponseView, ensureAbsoluteUrl} from './haapiUtils.js';
import {authenticateWithBankID, findPollAction, findQrCode} from './bankid.js';
import Configuration from '../configuration.js';
import {Session} from './sessionManager.js';

export type AuthorizationResult = { success: boolean; message: string; qrCode?: string }

const config = new Configuration();
const qrCodeMessage = 'Please confirm the action by scanning the QR code with your BankID app.';

/*
 * Creates a HAAPI client
 */
export async function createAuthenticatedHaapiClient(): Promise<DPoPOAuthClient> {
    const client = new DPoPOAuthClient();
    await client.authenticateClient(ensureAbsoluteUrl(config.tokenEndpoint), 'urn:se:curity:scopes:haapi');
    return client;
}

/*
 * Starts OAuth authorization for the end user via HAAPI
 */
async function sendAuthorizationRequest(client: DPoPOAuthClient): Promise<Response> {
    // 
    const url = new URL(ensureAbsoluteUrl(config.authorizationEndpoint));
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('client_id', config.haapiClientId);
    url.searchParams.append('redirect_uri', config.redirectUri);
    url.searchParams.append('scope', config.scope);
    url.searchParams.append('state', 'random-state-value');
    url.searchParams.append('acr', config.acr);
    return client.get(url.toString(), haapiHeaders)
}

/*
 * Use the access token authenticator as the first factor, which sets the authenticated subject from the access token
 */
async function authenticateWithAccessTokenAuthenticator(
    receivedAccessToken: string,
    client: DPoPOAuthClient,
    accessTokenView: AccessTokenAuthenticatorView,
): Promise<Response> {

    return client.postForm(
        ensureAbsoluteUrl(accessTokenView.actions[0].model.href),
        {
            token: receivedAccessToken,
        },
        haapiHeaders
    );
}

/*
 * The entry point for the BankID high security authenticator, which handles polling, completion and failure
 */
export async function authorizeWithBankID(receivedAccessToken: string, session: Session): Promise<AuthorizationResult> {
    try {
        if (!session.client) {
            session.client = await createAuthenticatedHaapiClient();
        }

        const client = session.client;

        const bankIDView = await runBankIDAuthenticationFlow(receivedAccessToken, client);
        const qrCode = findQrCode(bankIDView);

        const pollAction = findPollAction(bankIDView);
        const urlForPolling = pollAction.model.href;
        session.pollingUrl = urlForPolling;
        session.pollingCount = 0;

        return {
            success: true,
            message: qrCodeMessage,
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

/**
 * Run the HAAPI authentication flow up to the BankID authenticator.
 *
 * The Curity Server must be configured such that the BankID authenticator
 * has a pre-requisite authenticator of type "access_token" for this to work.
 *
 * @param oauthClient optional OAuth client
 * @returns the initial BankID authenticator view (caller must poll until authentication is complete)
 */
export async function runBankIDAuthenticationFlow(receivedAccessToken: string, oauthClient?: DPoPOAuthClient): Promise<BankdIDAuthenticatorView> {

    const client = oauthClient || await createAuthenticatedHaapiClient();
    const authResponse = await sendAuthorizationRequest(client);

    // Should get to the access_token authenticator view directly
    const accessTokenView = await haapiResponseView<AccessTokenAuthenticatorView>(
        authResponse,
        client);

    console.log('Access Token Authenticator response:', JSON.stringify(accessTokenView, null, 2));

    // submit the access token, expect the next authenticator to be BankID
    const bankIDView = await haapiResponseView<BankdIDAuthenticatorView>(
        await authenticateWithAccessTokenAuthenticator(receivedAccessToken, client, accessTokenView),
        client
    );

    console.log('HAAPI BankID authenticator response:', JSON.stringify(bankIDView, null, 2));

    return bankIDView;
}

/*
 *
 */
export async function continueAuthorizeWithBankID(onToken: (token: string) => void, session: Session): Promise<AuthorizationResult> {
    try {
        if (!session.client) {
            session.client = await createAuthenticatedHaapiClient();
        }

        const client = session.client;

        console.log(`>>> Poll authentication at ${session.pollingUrl}. Attempt ${session.pollingCount}.`)

        const authenticationResponse = await authenticateWithBankID(client, session.pollingUrl)

        if (authenticationResponse.status == 'failed' || session.pollingCount > 30) {
            return {
                success: false,
                message: 'Authorization failed. Please try again later.'
            }
        }

        session.pollingCount = session.pollingCount + 1;

        if (authenticationResponse.status == 'continue') {
            session.pollingUrl = authenticationResponse.pollingUrl!;

            return {
                success: true,
                message: qrCodeMessage,
                qrCode: authenticationResponse.currentQRCode!,
            };
        }

        // Authentication done, we have token.
        onToken(authenticationResponse.accessToken!);

        return {
            success: true,
            message: 'Authentication finished'
        };

    } catch (error) {
        console.error('Error generating QR code:', error);
        return {
            success: false,
            message: 'Authorization failed. Please try again later.',
        };
    }
}
