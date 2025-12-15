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

import express, { Request, Response } from 'express';
import morgan from 'morgan';
import { OAuthFilter } from './security/oauthFilter.js';
import { Configuration } from './configuration.js';
import { ErrorHandler } from './errors/errorHandler.js';
import { ApiError } from './errors/apiError.js';

/*
 * This API uses hard coded initial stocks for any test user
 */
const portfolio = [
    {
        "id": "MSFT",
        "name": "Microsoft Corporation",
        currentPrice: 486.74,
        quantity: 23,
    },
    {
        "id": "NVDA",
        "name": "NVIDIA Corp",
        currentPrice: 183.65,
        quantity: 56,
    },
    {
        "id": "AAPL",
        "name": "Apple Inc",
        currentPrice: 282.56,
        quantity: 12
    },
];

/*
 * Load configuration and create helper objects
 */
const configuration = new Configuration();
const oauthFilter = new OAuthFilter(configuration);
const errorHander = new ErrorHandler();

/*
 * Configure middleware
 */
const app = express();
app.use(morgan('combined'));
app.use(express.json());
app.use(oauthFilter.validateAccessToken);

/*
 * Only a low privilege scope is required to view the portfolio balances
 */
app.get('/api/portfolio', (request: Request, response: Response) => {
    
    (response.locals as any).claimsPrincipal.enforceScope(configuration.lowPrivilegeScope);
    response.json(portfolio);
});

/*
 * A high privilege scope is required to execute transactions
 */
app.put('/api/portfolio/:id', (request: Request, response: Response) => {

    (response.locals as any).claimsPrincipal.enforceScope(configuration.highPrivilegeScope);

    const stockIndex = portfolio.findIndex(t => t.id === request.params.id);
    if (!stockIndex) {
        throw new ApiError(404, 'stock_not_found', 'Unable to update data for the requested stock');
    }

    const delta = request.body.delta;
    const newQuantity = portfolio[stockIndex].quantity + delta;
    portfolio[stockIndex].quantity = newQuantity;
    response.json(portfolio[stockIndex]);
});

/*
 * Process unhandled exceptions
 */
app.use(errorHander.onUnhandledException)

/*
 * Start the API
 */
app.listen(configuration.port, () => {
    console.log(`🚀 API Server listening on http://localhost:${configuration.port} ...`);
});
