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

import {DPoPOAuthClient} from '../haapi/dpopOAuthClient.js';
import {PollingData} from "../haapi/bankid.js";

/*
 * Serializable session data
 */
export interface Session {

    // Session identifiers
    id: string;

    // Time details
    createdAt: Date;
    lastAccessedAt: Date;

    // OAuth details
    client: DPoPOAuthClient | null;
    highPrivilegeAccessToken: string | undefined;
    delegationId: string | undefined;

    // Polling for BankID completion
    pollingData: PollingData | null;
    pollingCount: number;
}
