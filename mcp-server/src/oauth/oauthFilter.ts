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

import {Request, Response, NextFunction} from 'express';
import {createRemoteJWKSet, JWTVerifyGetKey, JWTVerifyOptions, jwtVerify} from 'jose';
import {JOSEError} from 'jose/errors';
import {ClaimsPrincipal} from './claimsPrincipal.js';
import {Configuration} from '../configuration.js';
import {getAndLogResponseError} from '../errors/errorHandler.js';
import {McpServerError} from '../errors/mcpServerError.js';
import {AuthInfo} from '@modelcontextprotocol/sdk/server/auth/types.js';

/*
 * The base OAuth work to authenticate MCP server requests
 */
export class OAuthFilter {

    private readonly configuration: Configuration;
    private readonly remoteJwksSet: JWTVerifyGetKey;

    public constructor(configuration: Configuration) {

        this.configuration = configuration;
        this.remoteJwksSet = createRemoteJWKSet(<URL>new URL(configuration.jwksUri));
        this.execute = this.execute.bind(this);
    }

    /*
     * Validate a JWT and produce claims for authorization
     */
    public async execute(request: Request, response: Response, next: NextFunction): Promise<void> {

        try {
            
            (request as any).auth = await this.validateAccessToken(request, response);
            next();

        } catch (e: any) {

            const error = getAndLogResponseError(e);
            if (error.status === 401 || error.status === 403) {

                const metadataUrl = `${this.configuration.externalBaseUrl}/.well-known/oauth-protected-resource`;
                const scope = this.configuration.requiredScope;
                response.setHeader(
                    'WWW-Authenticate',
                    `Bearer error="${error.code}", error_description="${error.message}", resource_metadata="${metadataUrl}", scope="${scope}"`
                );
            }
            
            response.status(error.status).send(JSON.stringify(error.toHttpErrorResponse()));
        }
    }

    /*
     * Do the work and throw on error
     */
    public async validateAccessToken(request: Request, response: Response): Promise<AuthInfo> {

        const accessToken = this.readAccessToken(request);
        if (!accessToken) {
            throw new McpServerError(401, 'invalid_token', 'Missing, invalid or expired access token');
        }

        // Supply JWT validation inputs, including the MCP server's audience
        const options = {
            issuer: this.configuration.requiredIssuer,
            audience: this.configuration.requiredAudience,
            algorithms: [this.configuration.requiredJwtAlgorithm],
        } as JWTVerifyOptions;

        let result: any
        try {

            // Do the validation
            result = await jwtVerify(accessToken, this.remoteJwksSet, options);

        } catch (ex: any) {

            // Capture error data
            let extra: any = null;
            if (ex instanceof JOSEError) {
               extra = {
                   code: ex.code,
                    message: ex.message,
               }
            }

            // Throw JWT validation errors
            const error = new McpServerError(401, 'invalid_token', 'Missing, invalid or expired access token');
            error.extra = extra;
            throw error;
        }

        // Throw scope enforcement errors
        const claimsPrincipal = new ClaimsPrincipal(this.configuration, result.payload);
        claimsPrincipal.enforceRequiredScope();

        // If the JWT is OK, make claims available to both MCP session creation and MCP tools
        response.locals.claims = claimsPrincipal;
        return {
            token: accessToken,
            clientId: '',
            scopes: [],
            extra: {
                claims: claimsPrincipal,
            },
        };
    }

    /*
     * Read the access token from the HTTP authorization header
     */
    private readAccessToken(request: Request): string | null {

        const authorizationHeader = request.header('authorization');
        if (authorizationHeader) {
            const parts = authorizationHeader.split(' ');
            if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
                return parts[1];
            }
        }

        return null;
    }
}
