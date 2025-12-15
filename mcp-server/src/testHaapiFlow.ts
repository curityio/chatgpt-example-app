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

import Configuration from './configuration.js';
import {Authorizer} from './stepup/authorizer.js';
import {authenticateWithBankID} from './stepup/bankid.js';

// Load configuration and create an authorizer
const configuration = new Configuration();
const authorizer = new Authorizer(configuration);

// Create the HAAPI client
const client = await authorizer.createAuthenticatedHaapiClient();

// Feed in an access token saved from a previous debug session and re-run the HAAPI flow
const initialAccessToken = process.env.HAAPI_TEST_ACCESS_TOKEN || '';
await authorizer.runBankIDAuthenticationFlow(initialAccessToken, client);

// After the user approves, follow redirects to complete the flow 
await authenticateWithBankID(configuration, client, '');
