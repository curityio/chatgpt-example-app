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

import express, {Request, Response} from 'express';
import morgan from 'morgan';
import {OAuthFilter} from './security/oauthFilter.js';
import {Configuration} from './configuration.js';
import {ErrorHandler} from './errors/errorHandler.js';
import {ApiError} from './errors/apiError.js';
import {ClaimsPrincipal} from './security/claimsPrincipal.js';

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

class Transaction {
    public readonly id: number;
    public readonly stockId: string;
    public readonly delta: number;
    public readonly personalNumber: string;
    public readonly createdAt: number;


    constructor(id: number, stockId: string, delta: number, personalNumber: string, createdAt: number) {
        this.id = id;
        this.stockId = stockId;
        this.delta = delta;
        this.personalNumber = personalNumber;
        this.createdAt = createdAt;
    }
}

const transactions = [] as Transaction[];

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

    const claimsPrincipal = (response.locals as any).claimsPrincipal as ClaimsPrincipal;
    if (!claimsPrincipal.hasRequiredScope(configuration.lowPrivilegeScope)) {

            const error = new ApiError(
                403,
                'insufficient_scope',
                'The access token does not contain the required scope');
            error.scope = configuration.lowPrivilegeScope;
            throw error;
    }

    response.json(portfolio);
});

app.put('/api/portfolio/:id', (request: Request, response: Response) => {

    const claimsPrincipal = (response.locals as any).claimsPrincipal as ClaimsPrincipal;

    // First, check if the token contains a transaction_transactionID scope
    const transactionScope = claimsPrincipal.findTransactionScope();

    if (transactionScope) {
        // Now, check whether the given transaction exists.
        const transactionId = parseInt(transactionScope.split('_')[1]);
        const transactionIndex = transactions.findIndex(tr => tr.id === transactionId);

        console.log(`Searching for transaction with ${transactionId}, found index is ${transactionIndex}`)

        if (transactionIndex === -1) {
            throw new ApiError(
                404,
                'not_found',
                'Transaction not found'
            );
        }

        const transaction = transactions[transactionIndex];

        // Check whether personal_number matches the transaction.
        if (transaction.personalNumber !== claimsPrincipal.personalNumber) {
            throw new ApiError(
                404,
                'not_found',
                'Transaction not found'
            );
        }

        // Commit the transaction and return response.
        const stockIndex = portfolio.findIndex(t => t.id === transaction.stockId);
        if (stockIndex === -1) {
            throw new ApiError(404, 'stock_not_found', `Unable to update data for the requested stock ${transaction.stockId}`);
        }

        portfolio[stockIndex].quantity = portfolio[stockIndex].quantity + transaction.delta;

        // Remove the commited transaction
        transactions.splice(transactionIndex, 1);

        response.json(portfolio[stockIndex]);

    } else {
        // The transaction scope is not present.
        // Check whether the token contains the portfolio scope

        if (!claimsPrincipal.hasRequiredScope(configuration.lowPrivilegeScope)) {
            const error = new ApiError(
                403,
                'insufficient_scope',
                'The access token does not contain the required scope');
            error.scope = configuration.lowPrivilegeScope;
            throw error;
        }

        // Create a new transaction and return a 403 response asking for the new scope.
        const newTransaction = new Transaction(
            transactions.length + 1,
            request.params.id,
            request.body.delta,
            claimsPrincipal.personalNumber,
            Date.now()
        );

        transactions.push(newTransaction);

        const error = new ApiError(
            403,
            'insufficient_scope',
            'To finish transaction obtain an access token with the required scope');
        error.scope = `transaction_${newTransaction.id}`;
        throw error;
    }
});

// Add GET /api/transactions/:id endpoint
// Note: this endpoint is currently available anonymously. The intention is that only the AS should have access to this endpoint. Best practice would be to secure it with a proper token (client credentials or user token? or maybe mTLS?)
app.get('/api/transactions/:id', (request: Request, response: Response) => {
    const transactionId = parseInt(request.params.id);
    if (isNaN(transactionId)) {
        throw new ApiError(404, 'not_found', 'Transaction not found');
    }

    const transaction = transactions.find(tr => tr.id === transactionId);

    if (!transaction) {
        throw new ApiError(404, 'not_found', 'Transaction not found');
    }

    response.json(transaction);
});

/*
 * Process unhandled exceptions
 */
app.use(errorHander.onUnhandledException)

/*
 * Start the API
 */
app.listen(configuration.port, () => {
    console.log(`🚀 Portfolio API listening on http://localhost:${configuration.port} ...`);
});
