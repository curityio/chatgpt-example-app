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
 * Return the default server error
 */
function getDefaultServerError(): McpServerError {
    return new McpServerError(500, 'server_error', 'Problem encountered in the MCP server');
}

/*
 * Return the response error
 */
export function getAndLogResponseError(e: any): McpServerError {

    if (e instanceof McpServerError) {
        logError(e);
        return e;
    }

    const error = getDefaultServerError();
    error.addException(e);
    logError(error);
    return error.toMcpToolErrorResponse();
}

/*
 * Log error details before returning to the client
 */
export function logError(error: McpServerError) {

    const data = error.toLogObject();
    console.log(JSON.stringify(data, null, 2));
}
