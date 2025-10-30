import type { DPoPOAuthClient } from './oauth_client';
import type { HaapiView, HaapiRedirect } from './haapi_types';

export const haapiHeaders = {
    'Accept': 'application/vnd.auth+json'
};

export async function haapiResponseView<View extends HaapiView>(
    response: Response, client: DPoPOAuthClient): Promise<View> {
    if (response.status != 200) {
        throw new Error(`HAAPI request failed: ${response.status} ${await response.text()}`);
    }
    if (response.headers.get('Content-Type') !== 'application/vnd.auth+json') {
        throw new Error(`Unexpected HAAPI response content type: ${response.headers.get('Content-Type')}`);
    }

    let view = await response.json() as HaapiView;

    // attempt to handle HAAPI redirects automatically
    if (view.type === 'redirection-step') {
        const redirectView = view as HaapiRedirect;
        console.log('Following HAAPI redirect to:', redirectView.actions[0].model.href);
        const redirectResponse = await client.get(redirectView.actions[0].model.href, haapiHeaders);
        return haapiResponseView<View>(redirectResponse, client);
    }
    return view as View;
}
