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

/*
 * A simple error object
 */
export class McpServerError extends Error {

    public readonly status: number;
    public readonly code: string;
    public extra: any;
    public scope: string | null;

    public constructor(status: number, code: string, message: string) {
        super(message);
        this.status = status;
        this.code = code;
        this.extra = null;
        this.scope = null;
    }

    public set extraData(value: any) {
        this.extra = value;
    }

    public get extraData(): any {
        return this.extra;
    }

    public set stepupScope(value: any) {
        this.scope = value;
    }

    public get stepupScope(): string | null {
        return this.scope;
    }

    /*
     * Capture any exception details
     */
    public addException(e: any) {
       
        this.extra = {};
        if (e.message) {
            this.extra.message = e.message;
        }
        if (e.stack) {
            this.extra.stack = e.stack;
        }
    }

    /*
     * Return the error body for HTTP responses
     */
    public toHttpErrorResponse(): any {

        return {
            code: this.code,
            message: this.message,
        }
    }

    /*
     * Return the structured error content for MCP tool responses
     */
    public toMcpToolErrorResponse(): any {

        const data: any = {
            error: {
                status: this.status,
                code: this.code,
                message: this.message,
            },
        };

        return {
            content: [{ type: 'text', text: JSON.stringify(data) }],
            isError: true,
        };
    }

    /*
     * Logs all errors in a readable format
     */
    public toLogObject(): any {

        const data: any = {
            status: this.status,
            code: this.code,
            message: this.message,
        }

        if (this.extra) {
            data.extra = this.extra;
        }

        return data;
    }
}
