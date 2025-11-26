import { DPoPOAuthClient } from './oauth_client';
import {BankdIDAuthenticatorView, type OAuthAuthorizationResponseView, type PollAction, type RedirectAction} from './haapi_types';
import {ensureAbsoluteUrl, haapiHeaders, haapiResponseView} from './haapi_utils';
import Configuration from "./configuration";

export async function authenticateWithBankID(
    client: DPoPOAuthClient,
    pollingUrl: string,
    pollingCount: number,
    onToken: (token: string) => void
) {

    // Check status of authorization
    const bankIDViewCurrent = await haapiResponseView<BankdIDAuthenticatorView>(
        await client.get(ensureAbsoluteUrl(pollingUrl), haapiHeaders),
        client
    );
    console.log('>>> BankID poll response status:', bankIDViewCurrent);

    const status = bankIDViewCurrent.properties.status;
    timeoutCounter++;

    const qrCode = findQrCode(bankIDView);
    console.log('BankID QR Code (base64):', qrCode);

    let bankIDViewCurrent = bankIDView;

    let status = bankIDViewCurrent.properties.status



    if (status !== 'done') {
       console.log('>>> BankID authentication failed to complete in time');
       return;
    }

    // Finish authentication and eventually set token in the session
    const formAction = findFormAction(bankIDViewCurrent);

    console.log('>>> Continue authentication', formAction)

    const url = ensureAbsoluteUrl(formAction.model.href);
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

    const finalView = await haapiResponseView<OAuthAuthorizationResponseView>(redirectResponse as Response, client);

    console.log('Final authenticator response:', JSON.stringify(finalView, null, 2));

    if (finalView.metadata.viewName !== 'templates/oauth/success-authorization-response') {
        throw new Error('Expected final authorization-response view now!');
    }
    console.log('Authentication successful! Exchanging authorization code for access token...');

    const oauthCallbackUrl = finalView.links.find(link => link.rel === 'authorization-response')?.href;
    if (!oauthCallbackUrl) {
        throw new Error('No authorization-response link found in final OAuth authorization response view');
    }

    const config = new Configuration();

    const tokenResponse = await client.postAuthorizationCode(config.tokenEndpoint,
        finalView.properties.code, oauthCallbackUrl.substring(0, oauthCallbackUrl.indexOf('?')));

    console.log('OAuth token response:', tokenResponse);

    onToken(tokenResponse.access_token);

}

export function findQrCode(view: BankdIDAuthenticatorView): string {
    const qrCodeLink = view.links.find(link => link.rel === 'activation' && link.type === 'image/png');
    if (!qrCodeLink) {
        throw new Error('QR code link not found in BankID authenticator view');
    }
    if (qrCodeLink.href.startsWith('data:image/png;base64,')) {
        return qrCodeLink.href.substring('data:image/png;base64,'.length);
    }
    throw new Error('QR code link is not a base64 data URL: ' + qrCodeLink.href);
}

function findAction(view: BankdIDAuthenticatorView, kind: string) {
    const action = view.actions.find(action => action.kind === kind);
    if (!action) {
        throw new Error(`${kind} action not found in BankID authenticator view`);
    }
    return action;
}


export function findPollAction(view: BankdIDAuthenticatorView): PollAction {
    return findAction(view, 'poll') as PollAction
}

function findFormAction(view: BankdIDAuthenticatorView): RedirectAction {
    return findAction(view, 'form') as RedirectAction
}
