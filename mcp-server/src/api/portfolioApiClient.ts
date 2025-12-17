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

import {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import Configuration from '../configuration.js';
import {ApiError} from '../errors/apiError.js';

/*
 * Call the portfolio API with the low privilege access token
 */
export async function getPortfolio(configuration: Configuration, token: string): Promise<CallToolResult> {

    const options = {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    };
    
    console.log('Fetching portfolio from', configuration.apiUrl);
    const response = await callApi(configuration.apiUrl, options, 'getPortfolio');
    const portfolio = await response.json();
    const output = { result: portfolio };
    return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output };
}

/*
 * Call the portfolio API with the current access token
 * The initial request uses a low privilege access token
 * The step-up uses a high privilege access token after the user approves the transaction
 */
export async function buyOrSellStock(configuration: Configuration, id: string, delta: number, token: string): Promise<CallToolResult> {

    const options = {
        method: 'PUT',
        body: JSON.stringify({ delta }),
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    };
    
    const response = await callApi(`${configuration.apiUrl}/${id}`, options, 'buyOrSellStock');
    const result = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: { result } };
}

/*
 * Call the API and return the response
 * Also handle error processing and logging
 */
async function callApi(url: string, options: RequestInit, operation: string): Promise<Response> {

    try {
        const response = await fetch(url, options);
        if (response.status >= 200 && response.status <= 299) {
            return response;
        }

        const error = await getResponseError(response, operation);
        console.log(error.toLogObject());
        throw error;


    } catch (e: any) {

        if (e instanceof ApiError) {
            throw e;
        }

        throw new ApiError(
            500,
            'portfolio_api_connection_error',
            'Unable to connect to the portfolio API',
            e);
    }
}

/*
 * Return error details from the portfolio API
 */
async function getResponseError(response: Response, operation: string): Promise<ApiError> {

    let code = 'portfolio_api_error';
    let message = `${operation} error`;

    try {
        const data = await response.json() as any
        if (data.code && data.message) {
            code = data.code;
            message = data.message;
        }

    } catch (e: any) {
    }

    return new ApiError(response.status, code, message);
}
