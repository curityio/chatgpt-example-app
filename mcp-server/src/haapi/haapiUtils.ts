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
import type {HaapiView, HaapiRedirect, PollAction} from './haapiTypes.js';
import {PollingData} from './bankid.js';
import {McpServerError} from '../errors/mcpServerError.js';

export const haapiHeaders = {
    'Accept': 'application/vnd.auth+json'
};

export async function haapiResponseView<View extends HaapiView>(
    baseUrl: string, response: Response, client: DPoPOAuthClient): Promise<View> {

    if (response.status != 200) {
        const error = new McpServerError(response.status, 'haapi_request_failed', 'The HAAPI request did not complete successfully');
        error.extraData = await response.text();
        throw error;
    }

    if (response.headers.get('Content-Type') !== 'application/vnd.auth+json') {
        throw new Error(`Unexpected HAAPI response content type: ${response.headers.get('Content-Type')}`);
    }

    let view = await response.json() as HaapiView;

    // console.log('>>> The haapi view JSON: ', view);

    // attempt to handle HAAPI redirects automatically
    if (view.type === 'redirection-step') {

        const redirectView = view as HaapiRedirect;
        //console.log('>>> Redirect: ', JSON.stringify(redirectView, null, 2));
        const url = ensureAbsoluteUrl(baseUrl, redirectView.actions[0].model.href);
        //console.log('>>> Following HAAPI redirect to:', url);
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

export function createPollingData(pollAction: PollAction): PollingData {
    const urlForPolling = pollAction.model.href;
    const pollingData = {
        pollingUrl: urlForPolling,
        method: pollAction.model.method
    } as PollingData;

    if (pollAction.model.method === 'POST') {
        const fields: Record<string, string> = {};
        pollAction.model.fields?.forEach(field => fields[field.name] = field.value);
        pollingData.fields = fields;
    }

    return pollingData;
}
