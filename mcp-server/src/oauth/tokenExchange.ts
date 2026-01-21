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

import {Configuration} from '../configuration.js';
import {TokenResponse} from './tokenResponse.js';
import {makeFetchRequest} from '../errors/fetchClient.js';

/*
 * Exchange an access token with the MCP server's audience with an access token for the Portfolio API's audience
 */
export async function exchangeAccessToken(configuration: Configuration, accessToken: string) {

    const body = new URLSearchParams({
        client_id: configuration.tokenExchangeClientId,
        client_secret: configuration.tokenExchangeClientSecret,
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        subject_token: accessToken,
        subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
        audience: configuration.tokenExchangeAudience
    } as any);

    const requestHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
    };

    const options = {
        method: 'POST',
        headers: requestHeaders,
        body: body.toString(),
    } as RequestInit;

    console.log('>>> Token exchange request to: ' + configuration.tokenExchangeTokenEndpoint, body, requestHeaders, options);
    const response = await makeFetchRequest(configuration.tokenExchangeTokenEndpoint, options);
    const tokenResponse = await response.json() as TokenResponse;
    return tokenResponse.access_token;
}
