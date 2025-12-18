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
import {BankIDAuthenticatorView, type OAuthAuthorizationResponseView, type PollAction, type RedirectAction} from './haapiTypes.js';
import {ensureAbsoluteUrl, haapiHeaders, haapiResponseView} from './haapiUtils.js';
import {Configuration} from '../configuration.js';

export type AuthenticateWithBankIDResult = {
    status: 'continue' | 'done' | 'failed',
    currentQRCode: string | undefined,
    pollingUrl: string | undefined,
    accessToken: string | undefined
}

export async function authenticateWithBankID(
    configuration: Configuration,
    client: DPoPOAuthClient,
    pollingUrl: string
): Promise<AuthenticateWithBankIDResult> {

    // Check status of authorization
    const bankIDViewCurrent = await haapiResponseView<BankIDAuthenticatorView>(
        configuration.authorizationServerBaseUrl,
        await client.get(ensureAbsoluteUrl(configuration.authorizationServerBaseUrl, pollingUrl), haapiHeaders),
        client
    );
    console.log('>>> BankID poll response status:', bankIDViewCurrent);

    const status = bankIDViewCurrent.properties.status;

    if (status == 'failed') {
        return {
            status: 'failed'
        } as AuthenticateWithBankIDResult;
    }

    if (status == 'pending') {
        const pollAction = findPollAction(bankIDViewCurrent);
        return {
            status: 'continue',
            pollingUrl: pollAction.model.href,
            currentQRCode: findQrCode(bankIDViewCurrent)
        } as AuthenticateWithBankIDResult;
    }

    // Finish authentication and eventually set token in the session
    const formAction = findFormAction(bankIDViewCurrent);

    console.log('>>> Continue authentication', formAction)

    const url = ensureAbsoluteUrl(configuration.authorizationServerBaseUrl, formAction.model.href);
    console.log('>>> Redirecting after successful authentication: ', formAction);

    let redirectResponse = null;

    if (formAction.model.method === 'POST') {
        const formData: Record<string, string> = {};
        for (const field of formAction.model.fields || []) {
            formData[field.name] = field.value;
        }
        redirectResponse = await client.postForm(url, formData, haapiHeaders);
    } else if (formAction.model.method === 'GET') {
        redirectResponse = await client.get(url, haapiHeaders);
    } else if (formAction.model.method !== 'GET') {
        throw new Error(`Unsupported redirect method: ${formAction.model.method}`);
    }

    const finalView = await haapiResponseView<OAuthAuthorizationResponseView>(
        configuration.authorizationServerBaseUrl, redirectResponse as Response, client);

    console.log('>>> Final authenticator response:', JSON.stringify(finalView, null, 2));

    if (finalView.metadata.viewName !== 'templates/oauth/success-authorization-response') {
        throw new Error('Expected final authorization-response view now!');
    }
    console.log('>>> Authentication successful! Exchanging authorization code for access token...');

    const oauthCallbackUrl = finalView.links.find(link => link.rel === 'authorization-response')?.href;
    if (!oauthCallbackUrl) {
        throw new Error('No authorization-response link found in final OAuth authorization response view');
    }

    const tokenResponse = await client.postAuthorizationCode(configuration.tokenEndpoint,
        finalView.properties.code, oauthCallbackUrl.substring(0, oauthCallbackUrl.indexOf('?')));

    console.log('>>> HAAPI token response:', tokenResponse);

    return {
        status: 'done',
        accessToken: tokenResponse.access_token
    } as AuthenticateWithBankIDResult;
}

export function findQrCode(view: BankIDAuthenticatorView): string {
    const qrCodeLink = view.links.find(link => link.rel === 'activation' && link.type === 'image/png');
    if (!qrCodeLink) {
        throw new Error('QR code link not found in BankID authenticator view');
    }
    if (qrCodeLink.href.startsWith('data:image/png;base64,')) {
        return qrCodeLink.href.substring('data:image/png;base64,'.length);
    }
    throw new Error('QR code link is not a base64 data URL: ' + qrCodeLink.href);
}

function findAction(view: BankIDAuthenticatorView, kind: string) {
    const action = view.actions.find(action => action.kind === kind);
    if (!action) {
        throw new Error(`${kind} action not found in BankID authenticator view`);
    }
    return action;
}


export function findPollAction(view: BankIDAuthenticatorView): PollAction {
    return findAction(view, 'poll') as PollAction
}

function findFormAction(view: BankIDAuthenticatorView): RedirectAction {
    return findAction(view, 'form') as RedirectAction
}
