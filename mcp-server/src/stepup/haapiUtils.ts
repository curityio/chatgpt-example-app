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

import type {DPoPOAuthClient} from './dpopOAuthClient.js';
import type {HaapiView, HaapiRedirect} from './haapiTypes.js';

export const haapiHeaders = {
    'Accept': 'application/vnd.auth+json'
};

export async function haapiResponseView<View extends HaapiView>(
    baseUrl: string, response: Response, client: DPoPOAuthClient): Promise<View> {

    if (response.status != 200) {
        throw new Error(`HAAPI request failed: ${response.status} ${await response.text()}`);
    }
    if (response.headers.get('Content-Type') !== 'application/vnd.auth+json') {
        throw new Error(`Unexpected HAAPI response content type: ${response.headers.get('Content-Type')}`);
    }

    let view = await response.json() as HaapiView;

    console.log('>>> The haapi view JSON: ', view);

    // attempt to handle HAAPI redirects automatically
    if (view.type === 'redirection-step') {
        
        const redirectView = view as HaapiRedirect;
        console.log('REDIRECT: ', JSON.stringify(redirectView, null, 2));
        const url = ensureAbsoluteUrl(baseUrl, redirectView.actions[0].model.href);
        console.log('Following HAAPI redirect to:', url);
        const action = redirectView.actions[0];
        
        if (action.model.method === 'POST') {
            const formData: Record<string, string> = {};
                for (const field of action.model.fields || []) {
                    formData[field.name] = field.value;
                }
                const redirectResponse = await client.postForm(url, formData, haapiHeaders);
                return haapiResponseView<View>(baseUrl, redirectResponse, client);
        }

        if (action.model.method !== 'GET') {
            throw new Error(`Unsupported redirect method: ${action.model.method}`);
        }
        const redirectResponse = await client.get(url, haapiHeaders);
        return haapiResponseView<View>(baseUrl, redirectResponse, client);
    }
    return view as View;
}

export function ensureAbsoluteUrl(baseUrl: string, url: string): string {

    if (url.startsWith('http')) {
        return url;
    }

    // Turn the URL into an absolute one if it's relative
    return new URL(url, baseUrl).toString();
}
