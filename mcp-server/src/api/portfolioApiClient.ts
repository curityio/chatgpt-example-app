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

/*
 * Call the portfolio API with the low privilege access token
 */
export async function getPortfolio(configuration: Configuration, token: string): Promise<CallToolResult> {

    console.log('Fetching portfolio from', configuration.apiUrl);
    const response = await fetch(configuration.apiUrl, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });

    const authError = resultIfAuthorizationError(response);
    if (authError) {
        return authError;
    }

    if (response.status !== 200) {
        throw new Error('Failed to fetch portfolio');
    }
    const portfolio = await response.json();
    const output = { result: portfolio };
    return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output };
}

/*
 * Call the portfolio API with the high privilege access token
 */
export async function buyOrSellStock(configuration: Configuration, id: string, delta: number, token: string): Promise<CallToolResult> {

    const response = await fetch(`${configuration.apiUrl}/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ delta }),
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });

    const authError = resultIfAuthorizationError(response);
    if (authError) {
        return authError;
    }

    if (response.status !== 200) {
        throw new Error('Failed to buy or sell stocks');
    }
    const result = await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: { result } };
}

/*
 * Handle errors calling ghe Portfolio API
 */
function resultIfAuthorizationError(response: Response): CallToolResult | null {
  
  if (response.status >= 400 && response.status < 500) {
      const errorMessage = 'User must obtain authorization to call this tool';
      return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
          structuredContent: { result: [] }
      };
  }

  return null;
}

