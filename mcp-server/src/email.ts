import {DPoPOAuthClient} from "./oauth_client";
import {EmailAuthenticatorView, type OAuthAuthorizationResponseView} from "./haapi_types";
import {haapiHeaders, haapiResponseView} from "./haapi_utils";
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
    const status = emailView.properties.status


    while (status !== 'completed' && timeoutCounter < 12) {
        const pollAction = findPollAction(emailViewCurrent);
        emailViewCurrent = await haapiResponseView<EmailAuthenticatorView>(
            await client.get(pollAction.model.href, haapiHeaders),
            client
        );
        console.log('Email poll response status:', emailViewCurrent);

        await new Promise(resolve => setTimeout(resolve, 2000));
        timeoutCounter++;
    }

    if (status !== 'completed') {
        throw new Error('Authentication did not finish');
    }

    const finalView = await haapiResponseView<OAuthAuthorizationResponseView>(
        await client.get(emailViewCurrent.links[0].href, haapiHeaders) // FIXME (what should it be here?)
        , client);

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
