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

import {KeyPair} from 'dpop'

/*
 * Serializable session data
 */
export interface Session {
    
    // Details about this session
    id: string;
    createdAt: Date;
    lastAccessedAt: Date;

    // The delegation ID from the MCP client's access token from original user authentication
    delegationId?: string;

    // Serializable details about the backend HAAPI step-up authentication flow
    dpopKeyPair?: KeyPair;
    haapiAccessToken?: string;
    haapiTokenType?: string;
    haapiExpiresAt?: Date;
    haapiSessionId?: string;

    // Polling details for BankID completion
    pollingUrl: string;
    pollingCount: number;
    
    // The access token issued once step-up authentication completes
    highPrivilegeAccessToken?: string;
}
