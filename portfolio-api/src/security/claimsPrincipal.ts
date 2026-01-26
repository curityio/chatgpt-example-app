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

import {JWTPayload} from 'jose';
import {ApiError} from '../errors/apiError.js';

/*
 * A convenience wrapper to expose claims to the API
 */
export class ClaimsPrincipal {

    private readonly scope: string;
    public readonly personalNumber: string;

    public constructor(claims: JWTPayload) {
        this.scope = this.getClaim(claims, 'scope');
        this.personalNumber = '19520408-2308';
    }

    public hasRequiredScope(expectedScope: string): boolean {
        return this.scope.split(' ').indexOf(expectedScope) !== -1;
    }

    private getClaim(claims: JWTPayload, name: string, required = true): any {

        const value = claims[name];
        if (!value && required) {
            throw new ApiError(403, 'insufficient_data', `The access token does not contain the required claim: ${name}`);
        }

        return value;
    }

    public findTransactionScope(): string | undefined {
        const scopes = this.scope.split(' ');
        for (const scope of scopes) {
            if (scope.startsWith('transaction_')) {
                return scope;
            }
        }

        return undefined;
    }
}
