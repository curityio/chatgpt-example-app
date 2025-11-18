import {DPoPOAuthClient} from "./oauth_client";
import {EmailAuthenticatorView, type HaapiRedirect, type OAuthAuthorizationResponseView} from "./haapi_types";
import {ensureAbsoluteUrl, haapiHeaders, haapiResponseView} from "./haapi_utils";
import Configuration from "./configuration";

export async function pollForToken(
    emailView: EmailAuthenticatorView,
    client: DPoPOAuthClient,
    onToken: (token: string) => void
) {
    let emailViewCurrent = emailView;

    // allow the user to click the email link before polling
    await new Promise(resolve => setTimeout(resolve, 5000));

    // TODO keep polling once every 2 seconds, until authentication is complete, but only for half a minute (12 times)

    let timeoutCounter = 0;
    let status = emailView.properties.status


    while (status !== 'done' && timeoutCounter < 12) {
        const pollAction = findPollAction(emailViewCurrent);
        emailViewCurrent = await haapiResponseView<EmailAuthenticatorView>(
            await client.get(ensureAbsoluteUrl(pollAction.model.href), haapiHeaders),
            client
        );
        console.log('>>> Email poll response status:', emailViewCurrent);
        status = emailViewCurrent.properties.status;

        await new Promise(resolve => setTimeout(resolve, 2000));
        timeoutCounter++;
    }

    if (status !== 'done') {
        throw new Error('Authentication did not finish');
    }

    const redirectAction = findRedirectAction(emailViewCurrent);

    const url = ensureAbsoluteUrl(redirectAction.model.href);
    console.log('>>> Redirecting after successful authentication: ', redirectAction);

    let redirectResponse = null;

    if (redirectAction.model.method === 'POST') {
        const formData: Record<string, string> = {};
        for (const field of redirectAction.model.fields || []) {
            formData[field.name] = field.value;
        }
        redirectResponse = await client.postForm(url, formData, haapiHeaders);
    } else if (redirectAction.model.method === 'GET') {
        redirectResponse = await client.get(url, haapiHeaders);
    } else if (redirectAction.model.method !== 'GET') {
        throw new Error(`Unsupported redirect method: ${redirectAction.model.method}`);
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

function findPollAction(view: EmailAuthenticatorView) {
    const action = view.actions.find(action => action.kind === 'poll');
    if (!action) {
        throw new Error('Poll action not found in Email authenticator view');
    }
    return action;
}

function findRedirectAction(view: EmailAuthenticatorView) {
    const action = view.actions.find(action => action.kind === 'redirect');
    if (!action) {
        throw new Error('Poll action not found in Email authenticator view');
    }
    return action;
}
