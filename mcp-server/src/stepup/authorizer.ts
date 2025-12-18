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
import type {AccessTokenAuthenticatorView, BankIDAuthenticatorView} from './haapiTypes.js';
import {haapiHeaders, haapiResponseView, ensureAbsoluteUrl} from './haapiUtils.js';
import {authenticateWithBankID, findPollAction, findQrCode} from './bankid.js';
import Configuration from '../configuration.js';
import {Session} from './sessionManager.js';

export type AuthorizationResult = { success: boolean; message: string; qrCode?: string }
const qrCodeMessage = 'Please confirm the action by scanning the QR code with your BankID app.';

/*
 * The entry point for HAAPI authorization
 */
export class Authorizer {

    private readonly configuration: Configuration;

    public constructor(configuration: Configuration) {
        this.configuration = configuration;
    }

    /*
    * Create a HAAPI client
    */
    public async createAuthenticatedHaapiClient(): Promise<DPoPOAuthClient> {
        const client = new DPoPOAuthClient(this.configuration);
        await client.authenticateClient(this.configuration.tokenEndpoint, 'urn:se:curity:scopes:haapi');
        return client;
    }

    /*
    * Start HAAPI OAuth authorization with a high privilege scope
    */
    public async sendAuthorizationRequest(client: DPoPOAuthClient): Promise<Response> {
        
        const url = new URL(this.configuration.authorizationEndpoint);
        url.searchParams.append('response_type', 'code');
        url.searchParams.append('client_id', this.configuration.haapiClientId);
        url.searchParams.append('redirect_uri', this.configuration.redirectUri);
        url.searchParams.append('scope', this.configuration.highPrivilegeScope);
        url.searchParams.append('state', 'random-state-value');
        url.searchParams.append('acr', this.configuration.acr);
        return client.get(url.toString(), haapiHeaders)
    }

    /*
    * Use the access token authenticator as the first factor, which sets the authenticated subject from the access token
    */
    public async authenticateWithAccessTokenAuthenticator(
        receivedAccessToken: string,
        client: DPoPOAuthClient,
        accessTokenView: AccessTokenAuthenticatorView,
    ): Promise<Response> {

        return client.postForm(
            ensureAbsoluteUrl(this.configuration.authorizationServerBaseUrl, accessTokenView.actions[0].model.href),
            {
                token: receivedAccessToken,
            },
            haapiHeaders
        );
    }

    /*
    * The entry point for the BankID high security authenticator, which handles polling, completion and failure
    */
    public async authorizeWithBankID(receivedAccessToken: string, session: Session): Promise<AuthorizationResult> {
        
        if (!session.client) {
            session.client = await this.createAuthenticatedHaapiClient();
        }

        const client = session.client;

        const bankIDView = await this.runBankIDAuthenticationFlow(receivedAccessToken, client);
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
    }

    /**
     * Start the HAAPI authentication flow and run the BankID authenticator
     *
     * The Curity Server must be configured such that the BankID authenticator
     * has a pre-requisite authenticator of type "access_token" for this to work.
     *
     * @param oauthClient optional OAuth client
     * @returns the initial BankID authenticator view (caller must poll until authentication is complete)
     */
    public async runBankIDAuthenticationFlow(receivedAccessToken: string, oauthClient?: DPoPOAuthClient): Promise<BankIDAuthenticatorView> {

        const client = oauthClient || await this.createAuthenticatedHaapiClient();
        const authResponse = await this.sendAuthorizationRequest(client);

        // Should get to the access_token authenticator view directly
        const accessTokenView = await haapiResponseView<AccessTokenAuthenticatorView>(
            this.configuration.authorizationServerBaseUrl,
            authResponse,
            client);

        console.log('Access Token Authenticator response:', JSON.stringify(accessTokenView, null, 2));

        // submit the access token, expect the next authenticator to be BankID
        const bankIDView = await haapiResponseView<BankIDAuthenticatorView>(
            this.configuration.authorizationServerBaseUrl,
            await this.authenticateWithAccessTokenAuthenticator(receivedAccessToken, client, accessTokenView),
            client
        );

        console.log('HAAPI BankID authenticator response:', JSON.stringify(bankIDView, null, 2));

        return bankIDView;
    }

    /*
    * Called when ChatGPT app sends a polling notification
    */
    public async continueAuthorizeWithBankID(onToken: (token: string) => void, session: Session): Promise<AuthorizationResult> {
        
        if (!session.client) {
            session.client = await this.createAuthenticatedHaapiClient();
        }

        const client = session.client;

        console.log(`>>> Poll authentication at ${session.pollingUrl}. Attempt ${session.pollingCount}.`);
        const authenticationResponse = await authenticateWithBankID(this.configuration, client, session.pollingUrl);

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

        // Authentication done, we have the high privilege access token
        onToken(authenticationResponse.accessToken!);

        return {
            success: true,
            message: 'Authentication finished'
        };
    }
}
