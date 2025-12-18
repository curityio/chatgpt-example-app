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

import {McpServerError} from '../errors/mcpServerError.js';

/*
 * Make a fetch request and read error details from the response
 * Make sure all errors are logged and handled by throwing an McpServerError object
 */
export async function makeFetchRequest(url: string, options: RequestInit): Promise<any> {

    try {
        
        // Do the fetch, which could fail with a connection error
        const response = await fetch(url, options);

        // Allow HAAPI redirect responses, so classify errors as those with 4xx or 5xx statuses
        const isOk = response.status >= 200 && response.status < 400;
        if (isOk) {
            return response;
        }

        // Throw a typed error
        throw await getResponseError(response);

    } catch (e: any) {

        // Already handled
        if (e instanceof McpServerError) {
            throw e;
        }

        // Report connection errors where fetch throws
        const error = new McpServerError(
            500,
            'fetch_connection_error',
            'A connection error occurred during a fetch request');
        error.addException(e);
        return error;
    }
}


/*
 * Try to read response error details
 */
async function getResponseError(response: Response): Promise<McpServerError> {

    let code = 'fetch_error';
    let message = 'Fetch operation failed'

    try {
        
        // Try to deserialize a JSON response, which could potentially throw
        const data = await response.json() as any;

        // Error responses from the Curity Identity Server return an error and may have an error_description
        if (data.error) {
            code = data.error;
            if (data.error_description) {
                message = data.error_description;
            }
        }

        // Error responses from the Portfolio API return a code and a message
        if (data.code && data.message) {
            code = data.code;
            message = data.message;
        }

    } catch (e: any) {
    }

    return new McpServerError(response.status, code, message);
}
