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
import {Transaction} from './transaction.js';

/*
 * The example API returns this hard-coded list of in-memory stocks for any test user
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
 * The example API returns this hard-coded list of in-memory stocks for any test user
 */
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

/*
 * During step-up, this returns transaction information to the authorization server to render in BankID's consent screen
 */
app.get('/api/transactions/:id', (request: Request, response: Response) => {

    const transactionId = parseInt(request.params.id as string);
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
 * This method is called twice, to first create an uncommitted transaction and then complete it
 */
app.put('/api/portfolio/:id', (request: Request, response: Response) => {

    const claimsPrincipal = (response.locals as any).claimsPrincipal as ClaimsPrincipal;

    const transactionScope = claimsPrincipal.findTransactionScope();
    if (!transactionScope) {

        // Before step-up, the access token should have the low privilege portfolio scope
        if (!claimsPrincipal.hasRequiredScope(configuration.lowPrivilegeScope)) {
            const error = new ApiError(
                403,
                'insufficient_scope',
                'The access token does not contain the required scope');
            error.scope = configuration.lowPrivilegeScope;
            throw error;
        }

        // Create a new uncommitted transaction for the ID
        const stockId = request.params.id as string;
        const newTransaction = new Transaction(
            transactions.length + 1,
            stockId,
            request.body.delta,
            claimsPrincipal.subject,
            Date.now()
        );
        transactions.push(newTransaction);

        // Return a 403 response to inform the client to step-up and supply an access token with the high privilege transaction scope
        const error = new ApiError(
            403,
            'insufficient_scope',
            'To complete the transaction, obtain an access token with the required scope');
        error.scope = `transaction_${newTransaction.id}`;
        throw error;

    } else  {

        // After step-up, the access token has a transaction scope, so get the transaction ID part of the prefix scope
        const transactionId = parseInt(transactionScope.split('_')[1]);
        console.log(`Searching for transaction with ID: ${transactionId}`)
        const transactionIndex = transactions.findIndex(tr => tr.id === transactionId);
        if (transactionIndex === -1) {
            throw new ApiError(
                404,
                'not_found',
                'Transaction not found'
            );
        }

        // Verify that the user matches the original transaction and that there is a BankID personal number
        const transaction = transactions[transactionIndex];
        if (transaction.subject !== claimsPrincipal.subject || !claimsPrincipal.personalNumber) {
            throw new ApiError(
                404,
                'not_found',
                'Transaction not found'
            );
        }
        console.log(`Recording BankID personal number: ${claimsPrincipal.personalNumber}`)
        transaction.personalNumber = claimsPrincipal.personalNumber;

        // Update the stock's balance to commit the transactionand return the new balance
        const stockIndex = portfolio.findIndex(t => t.id === transaction.stockId);
        if (stockIndex === -1) {
            throw new ApiError(404, 'stock_not_found', `Unable to update data for the requested stock ${transaction.stockId}`);
        }
        portfolio[stockIndex].quantity = portfolio[stockIndex].quantity + transaction.delta;
        transactions.splice(transactionIndex, 1);
        response.json(portfolio[stockIndex]);
    }
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
