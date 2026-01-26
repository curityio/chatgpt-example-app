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
import {haapiHeaders, haapiResponseView, ensureAbsoluteUrl, createPollingData} from './haapiUtils.js';
import {
    authenticateWithBankID,
    AuthenticateWithBankIDResult,
    findPollAction,
    findQrCode
} from './bankid.js';
import {Configuration} from '../configuration.js';
import {Session} from '../session/session.js';

export type AuthorizationResult = { success: boolean; message: string; qrCode?: string }
const qrCodeMessage = 'Please confirm the action by scanning the QR code with your BankID app.';

/*
 * The entry point for HAAPI authorization
 */
export class HaapiAuthorizer {

    private readonly configuration: Configuration;
    private client!: DPoPOAuthClient;

    public constructor(configuration: Configuration) {
        this.configuration = configuration;
    }

    /*
     * Begin the HAAPI flow, to trigger the initial download of the QR code
     */
    public async authorizeWithBankID(receivedAccessToken: string, session: Session, stepupScope: string): Promise<AuthorizationResult> {

        this.client = await this.createAuthenticatedHaapiClient(session);

        const bankIDView = await this.runBankIDAuthenticationFlow(receivedAccessToken, stepupScope);
        const qrCode = findQrCode(bankIDView);

        session.pollingData = createPollingData(findPollAction(bankIDView));
        session.pollingCount = 0;

        return {
            success: true,
            message: qrCodeMessage,
            qrCode: qrCode,
        };
    }

    /*
     * Called when ChatGPT app sends a request to poll for completion
     */
    public async continueAuthorizeWithBankID(onToken: (token: string) => void, session: Session): Promise<AuthorizationResult> {

        // Create a HAAPI client that uses the existing HAAPI access token to resume an authentication flow
        this.client = new DPoPOAuthClient(this.configuration, session);

        if (!session.pollingData) {
            return {
                success: false,
                message: 'No polling data to continue authorization'
            }
        }

        console.log(`>>> Poll authentication at ${session.pollingData.pollingUrl}. Attempt ${session.pollingCount}.`);
        const authenticationResponse = await authenticateWithBankID(this.configuration, this.client, session.pollingData);

        if (authenticationResponse.status == 'failed' || session.pollingCount > 30) {
            return {
                success: false,
                message: 'authentication_failure'
            }
        }

        session.pollingCount = session.pollingCount + 1;

        if (authenticationResponse.status == 'continue') {
            session.pollingData = authenticationResponse.pollingData!;

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
            message: 'authentication_success'
        };
    }

    /*
     * Create a HAAPI client and get the HAAPI access token
     */
    private async createAuthenticatedHaapiClient(session: Session): Promise<DPoPOAuthClient> {

        const client = new DPoPOAuthClient(this.configuration, session);
        await client.authenticateClient(this.configuration.tokenEndpoint, 'urn:se:curity:scopes:haapi');
        return client;
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
    private async runBankIDAuthenticationFlow(receivedAccessToken: string, stepupScope: string): Promise<BankIDAuthenticatorView> {

        const authResponse = await this.sendAuthorizationRequest(stepupScope!);

        // Should get to the access_token authenticator view directly
        const accessTokenView = await haapiResponseView<AccessTokenAuthenticatorView>(
            this.configuration.authorizationServerBaseUrl,
            authResponse,
            this.client);

        console.log('>>> Access Token Authenticator response:', JSON.stringify(accessTokenView, null, 2));

        // submit the access token, expect the next authenticator to be BankID
        const bankIDView = await haapiResponseView<BankIDAuthenticatorView>(
            this.configuration.authorizationServerBaseUrl,
            await this.authenticateWithAccessTokenAuthenticator(receivedAccessToken, accessTokenView),
            this.client
        );

        console.log('>>> HAAPI BankID authenticator response:', JSON.stringify(bankIDView, null, 2));

        return bankIDView;
    }

    /*
    * Start HAAPI OAuth authorization and add the high privilege scope
    */
    private async sendAuthorizationRequest(stepupScope: string): Promise<Response> {

        const url = new URL(this.configuration.authorizationEndpoint);
        url.searchParams.append('response_type', 'code');
        url.searchParams.append('client_id', this.configuration.haapiClientId);
        url.searchParams.append('redirect_uri', this.configuration.redirectUri);
        url.searchParams.append('scope', stepupScope);
        url.searchParams.append('state', 'random-state-value');
        url.searchParams.append('acr', this.configuration.acr);
        return this.client.get(url.toString(), haapiHeaders)
    }

    /*
    * Use the access token authenticator as the first factor, which sets the authenticated subject from the access token
    */
    private async authenticateWithAccessTokenAuthenticator(
        receivedAccessToken: string,
        accessTokenView: AccessTokenAuthenticatorView,
    ): Promise<Response> {

        return this.client.postForm(
            ensureAbsoluteUrl(this.configuration.authorizationServerBaseUrl, accessTokenView.actions[0].model.href),
            {
                token: receivedAccessToken,
            },
            haapiHeaders
        );
    }
}
