import type { DPoPOAuthClient } from './oauth_client';
import type { HaapiView, HaapiRedirect } from './haapi_types';
import config from '../config.json' with { type: 'json' };
import { Config } from './types/config';

const typedConfig = config as Config;

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
        console.log('REDIRECT: ', JSON.stringify(redirectView, null, 2));
        const url = ensureAbsoluteUrl(redirectView.actions[0].model.href);
        console.log('Following HAAPI redirect to:', url);
        const action = redirectView.actions[0];
        if (action.model.method === 'POST') {
            const formData: Record<string, string> = {};
                for (const field of action.model.fields || []) {
                    formData[field.name] = field.value;
                }
                const redirectResponse = await client.postForm(url, formData, haapiHeaders);
                return haapiResponseView<View>(redirectResponse, client);
        }
        if (action.model.method !== 'GET') {
            throw new Error(`Unsupported redirect method: ${action.model.method}`);
        }
        const redirectResponse = await client.get(url, haapiHeaders);
        return haapiResponseView<View>(redirectResponse, client);
    }
    return view as View;
}

export function ensureAbsoluteUrl(url: string): string {
    // turn the URL into an absolute one if it's relative
    const absolutePostBackUrl = url.startsWith('http') ? url :
        new URL(url, typedConfig.authn.serverBaseUrl).toString();
    return absolutePostBackUrl;
}
