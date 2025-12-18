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
import {Configuration} from '../configuration.js';
import {makeFetchRequest} from '../errors/fetchClient.js';

/*
 * Call the portfolio API with the low privilege access token
 */
export async function getPortfolio(configuration: Configuration, token: string): Promise<CallToolResult> {

    const options = {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    };
    
    console.log('>>> Fetching portfolio from', configuration.portfolioApiUrl);
    const response = await makeFetchRequest(configuration.portfolioApiUrl, options);
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
    
    const response = await makeFetchRequest(`${configuration.portfolioApiUrl}/${id}`, options);
    const result = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: { result } };
}
