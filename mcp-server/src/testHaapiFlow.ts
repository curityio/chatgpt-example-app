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
import {SessionManager} from './session/sessionManager.js';
import {Authorizer} from './haapi/authorizer.js';

// Use the same objects as the MCP server
const configuration = new Configuration();
const authorizer = new Authorizer(configuration);

// Configure the session for step up
const sessionManager = new SessionManager();
const session = sessionManager.createSession();
session.stepupScope = 'transactions';
session.pollingUrl = '';

// Debug the start of the flow to get the initial JWT access token, e.g. from MCP server debug logs
const initialAccessToken = process.env.TEST_ACCESS_TOKEN || '';
await authorizer.startHaapiTest(initialAccessToken, session);

// Render the QR code and approve in BankID

// Complete the flow to get a high privilege access token
const result = await authorizer.endHaapiTest(session);
console.log(result.accessToken);
