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

import {AuthInfo} from '@modelcontextprotocol/sdk/server/auth/types.js';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { Request, Response } from 'express';
import morgan from 'morgan';
import {readFileSync} from 'node:fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {z} from 'zod';
import Configuration from './configuration.js';
import {getPortfolio, buyOrSellStock} from './portfolioApiClient.js';
import {continueAuthorizeWithBankID} from './security/authz.js';
import {SessionManager} from './security/sessionManager.js';
import {exchangeAccessToken, requestAuthorization} from './security/stepUp.js';

/*
 * Create main objects
 */
const configuration = new Configuration();
const sessionManager = new SessionManager();
const server = new McpServer({ name: 'portfolio-server', version: '1.0.0' });

/*
 * ChatGPT downloads the MCP resource once connected
 */
const widgetAppBundle = readFileSync("dist/web/bundle.js", "utf8");
const css = readFileSync("dist/web/app.css", "utf8");
server.registerResource(
    "portfolio-widget",
    "ui://widget/portfolio-widget.html",
    {},
    async () => ({
        contents: [
            {
                uri: "ui://widget/portfolio-widget.html",
                mimeType: "text/html+skybridge",
                text: `
<div id="root"></div>
<style>${css}</style>
<script type="module">${widgetAppBundle}</script>
        `.trim(),
                _meta: {
                    "openai/widgetPrefersBorder": true,
                },
            },
        ],
    })
);

/*
 * The MCP server uses a low privilege access token to get the user's portfolio
 */
server.registerTool(
    'get_portfolio',
    {
        title: 'Get portfolio',
        description: "Returns the contents of the user's portfolio.",
        outputSchema: {
            result: z.array(
                z.object({
                    id: z.string(),
                    name: z.string(),
                    currentPrice: z.number(),
                    quantity: z.number()
                })
            )
        },
        _meta: {
            "openai/outputTemplate": "ui://widget/portfolio-widget.html",
            "openai/toolInvocation/invoking": "Getting your portfolio...",
            "openai/toolInvocation/invoked": "Portfolio ready",
        },
        // @ts-ignore
        securitySchemes: [
            { type: "oauth2" }
        ]
    },
    async (context) => {
        const receivedAccessToken = context.authInfo?.token || '';
        const session = sessionManager.getOrCreateSession(context.sessionId);
        const token = await exchangeAccessToken(session, receivedAccessToken);
        return getPortfolio(token);
    },
);

/*
 * The MCP server gets a high privilege access token to buy stocks
 */
server.registerTool(
    'buy_stock',
    {
        description: 'Buys stocks of the given company',
        inputSchema: {
            id: z.string(),
            quantity: z.number()
        },
        outputSchema: {
            result: z.optional(z.object({
                id: z.string(),
                name: z.string(),
                currentPrice: z.number(),
                quantity: z.number()
            })),
            authMessage: z.optional(z.object({
                message: z.string(),
                qrCode: z.optional(z.string())
            }))
        },
        _meta: {
            "openai/outputTemplate": "ui://widget/portfolio-widget.html",
            "openai/toolInvocation/invoking": "Buying more stocks...",
            "openai/toolInvocation/invoked": "Stock bought.",
        },
        // @ts-ignore
        securitySchemes: [
            { type: "oauth2" }
        ]
    },
    async (input, context) => {
        const receivedAccessToken = context.authInfo?.token || '';
        const session = sessionManager.getOrCreateSession(context.sessionId);
        const token = await exchangeAccessToken(session, receivedAccessToken);

        console.log(`Buying ${input.quantity} stocks ${input.id} for session ${session.id}`);
        const completionResponse = await buyOrSellStock(input.id, input.quantity, token);

        if (completionResponse.isError) {
            return await requestAuthorization(receivedAccessToken, session);
        }

        return completionResponse;
    },
);

/*
 * The MCP server gets a high privilege access token to sell stocks
 */
server.registerTool(
    'sell_stock',
    {
        description: 'Sells the given quantity of stocks',
        inputSchema: {
            id: z.string(),
            quantity: z.number()
        },
        outputSchema: {
            result: z.optional(z.object({
                id: z.string(),
                name: z.string(),
                currentPrice: z.number(),
                quantity: z.number()
            })),
            authMessage: z.optional(z.object({
                message: z.string(),
                qrCode: z.optional(z.string())
            }))
        },
        _meta: {
            "openai/outputTemplate": "ui://widget/portfolio-widget.html",
            "openai/toolInvocation/invoking": "Selling some stock...",
            "openai/toolInvocation/invoked": "Stock sold.",
        },
        // @ts-ignore
        securitySchemes: [
            { type: "oauth2" }
        ]
    },
    async (input, context) => {
        const receivedAccessToken = context.authInfo?.token || '';
        const session = sessionManager.getOrCreateSession(context.sessionId);
        const token = await exchangeAccessToken(session, receivedAccessToken);

        console.log(`Selling ${input.quantity} of stock ${input.id} for session ${session.id}`);
        const completionResponse = await buyOrSellStock(input.id, -input.quantity, token);

        if (completionResponse.isError) {
            return await requestAuthorization(receivedAccessToken, session);
        }

        return completionResponse;
    },
);

/*
 * The MCP server provides a tool to poll for BankID completion
 */
server.registerTool(
    'continue_authorization',
    {
        description: 'Continue authorization',
        _meta: {
            "openai/widgetAccessible": true, // Make the tool accessible from the widget
            "openai/visibility": 'private' // Don't expose the tool to the LLM
        },
        outputSchema: {
            authMessage: z.object({
                message: z.string(),
                qrCode: z.optional(z.string())
            })
        },
        // @ts-ignore
        securitySchemes: [
            { type: "oauth2" }
        ]
    },
    async (context) => {
        const session = sessionManager.getOrCreateSession(context.sessionId);
        const authorizationResult = await continueAuthorizeWithBankID(
            (token) => {
                console.log('>>> Setting new token in session: ' + token);
                session.token = token
            },
            session)

        return {
            content: [],
            structuredContent: {
                authMessage: {
                    message: authorizationResult.message,
                    qrCode: authorizationResult.qrCode
                }
            }
        }
    }
);

/*
 * Create the Express application
 */
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../../web')));
app.use(morgan('combined'));
app.use(express.json());

/*
 * Serve MCP resource metadata
 */
app.get('/.well-known/oauth-protected-resource', (request: Request, response: Response) => {

    const config = new Configuration();
    const metadata = {
        resource: `${configuration.externalBaseUrl}/`,
        resource_name: 'MCP Server',
        authorization_servers: [config.authorizationServerBaseUrl],
        scopes_supported: [config.lowPrivilegeScope],
    };

    response.setHeader('content-type', 'application/json');
    response.status(200).send(JSON.stringify(metadata));
});

const setAuthInfo = (request: Request) => {

    let accessToken = '';

    const authorizationHeader = request.header('authorization');
    if (authorizationHeader) {
        const parts = authorizationHeader.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
            accessToken = parts[1];
        }
    }

    const authInfo: AuthInfo = {
        token: accessToken,
        clientId: '',
        scopes: [],
    };
    (request as any).auth = authInfo;
}

/*
 * Do the MCP boiler plate setup
 */
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
app.post('/', async (req, res) => {

    setAuthInfo(req);
    if (!(req as any).auth?.token) {

        return res
            .status(401)
            .header('Content-Type', 'application/json')
            .header('WWW-Authenticate', `Bearer error="invalid_token", error_description="Missing, invalid or expired access token", resource_metadata="${configuration.externalBaseUrl}/.well-known/oauth-protected-resource", scope="read"`)
            .send({'error': 'invalid_token', 'code': 'invalid_token', message: 'Missing, invalid or expired access token'})
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;
    if (sessionId && transports[sessionId]) {
      
        transport = transports[sessionId];

    } else {
      
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => sessionManager.createSession().id,
            onsessioninitialized: (sessionId) => {
                console.log(`Session initialized: ${sessionId}`);
                transports[sessionId] = transport;
            },
        });

        transport.onclose = () => {

            if (transport.sessionId) {
                console.log(`Session closed: ${transport.sessionId}`);
                delete transports[transport.sessionId];
                sessionManager.deleteSession(transport.sessionId);
            }
        };

        await server.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
});

const handleSessionRequest = async (req: express.Request, res: express.Response) => {

  const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
};

app.get('/', handleSessionRequest);
app.delete('/', handleSessionRequest);

/*
 * Start listening for requests
 */
app.listen(configuration.port, () => {
    console.log(`🚀 MCP Server listening on http://localhost:${configuration.port} ...`);
});
