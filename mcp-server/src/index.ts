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

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import express, {Request, Response} from 'express';
import morgan from 'morgan';
import {readFileSync} from 'node:fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {z} from 'zod';
import {getPortfolio, buyOrSellStock} from './api/portfolioApiClient.js';
import {Configuration} from './configuration.js';
import {OAuthFilter} from './oauth/oauthFilter.js';
import {McpServerError} from './errors/mcpServerError.js';
import {exchangeAccessToken} from './oauth/tokenExchange.js';
import {HaapiAuthorizer} from './haapi/haapiAuthorizer.js';
import {Session} from './session/session.js';
import {SessionManager} from './session/sessionManager.js';
import {getAndLogResponseError} from './errors/errorHandler.js';

/*
 * Create main objects
 */
const configuration = new Configuration();
const sessionManager = new SessionManager();
const oauthFilter = new OAuthFilter(configuration);
const haapiAuthorizer = new HaapiAuthorizer(configuration);
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

        try {

            const receivedAccessToken = context.authInfo?.token || '';
            const token = await exchangeAccessToken(configuration, receivedAccessToken);
            return await getPortfolio(configuration, token);

        } catch (e: any) {
            return getAndLogResponseError(e).toMcpToolErrorResponse();
        }
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
        const session = sessionManager.getOrCreateSession(context.sessionId, (context.authInfo?.extra as any)?.claims);
        const isRetry = !!session?.highPrivilegeAccessToken;

        try {
            
            // The initial request to the portfolio API is with a low privilege access token and triggers a step up
            // Once stepup completes, the portfolio API request re-runs with the session's high privilege access token
            const tokenToExchange = session?.highPrivilegeAccessToken || receivedAccessToken;
            const token = await exchangeAccessToken(configuration, tokenToExchange);

            console.log(`>>> Buying ${input.quantity} of stock ${input.id} for session ${session.id}`);
            return await buyOrSellStock(configuration, input.id, input.quantity, token);

        } catch (e: any) {

            // Handle the step-up challenge from the portfolio API, once only, by running a HAAPI flow
            // The server side HAAPI flow gets a high privilege access token and adds it to the session data
            const error = getAndLogResponseError(e);
            if (error.status === 403 && error.scope) {
                session.stepupScope = error.scope;
                console.log(`>>> Setting step-up scope for buy operation to ${session.stepupScope}`);
                return await requestAuthorization(receivedAccessToken, session);
            }

            return error.toMcpToolErrorResponse();

        } finally {

            // Only run the retry once to prevent loops
            if (isRetry) {
                sessionManager.clearStepupAuthenticationState(session);
            }
        }
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
        const session = sessionManager.getOrCreateSession(context.sessionId, (context.authInfo?.extra as any)?.claims);
        const isRetry = !!session.highPrivilegeAccessToken;

        try {
            
            // The initial request to the portfolio API is with a low privilege access token and triggers a step up
            // Once stepup completes, the portfolio API request re-runs with the session's high privilege access token
            const tokenToExchange = session?.highPrivilegeAccessToken || receivedAccessToken;
            const token = await exchangeAccessToken(configuration, tokenToExchange);

            console.log(`>>> Selling ${input.quantity} of stock ${input.id} for session ${session.id}`);
            return await buyOrSellStock(configuration, input.id, -input.quantity, token);

        } catch (e: any) {

            // Handle the step-up challenge from the portfolio API, once only, by running ta HAAPI flow
            // The server side HAAPI flow gets a high privilege access token and adds it to the session data
            const error = getAndLogResponseError(e);
            if (error.status === 403 && error.scope) {
                session.stepupScope = error.scope;
                console.log(`>>> Setting step-up scope for sell operation to ${session.stepupScope}`);
                return await requestAuthorization(receivedAccessToken, session);
            }

            return error.toMcpToolErrorResponse();

        } finally {

            // Only run the retry once to prevent loops
            if (isRetry) {
                sessionManager.clearStepupAuthenticationState(session);
            }
        }
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
        
        try {

            // Validate preconditions
            const session = sessionManager.getSession(context.sessionId || '', (context.authInfo?.extra as any)?.claims);
            if (!session?.stepupScope) {
                const message = 'The continue_authorization operation was called incorrectly';
                throw new McpServerError(400, 'invalid_request', message);
            }
            console.log(`>>> Continue operation has step-up scope: ${session.stepupScope}`);

            // When polling indicates that the flow is complete, add the high privilege access token to the session
            // The client calls the original but or sell method, which then uses this token to call the Portfolio API
            const authorizationResult = await haapiAuthorizer.continueAuthorizeWithBankID(
                (token) => {
                    console.log('>>> Setting high privilege access token in session: ' + token);
                    session.highPrivilegeAccessToken = token
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
        } catch (e: any) {
            return getAndLogResponseError(e).toMcpToolErrorResponse();
        }
    }
);

/*
 * Return the initial step up response to the MCP client
 */
export async function requestAuthorization(receivedAccessToken: string, session: Session): Promise<CallToolResult> {
    
    const checkMark = 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAABSlJREFUeF7tnUty1DAQhqUjhAtAFVeAXaqS2bDLFeAYsCIZVnAMuEJ2bDKpyo5cIVVwAXIEQzvWPGKPH1Kr3W39sxkSj1vt//ske5wh8a7nUVXVebP5snkOX/fthm3zJ7Bxzt1SG977q752fNfGBjxBB/D5YXJ0sD4mQkuABv4Nx6iooS6BlggHAlRVRctFWO7VdY+GWBI4kGArAOCzhGulyMp7T9cJbl+Aykr36JMlgVqCWgDMfpZArRXZeO9XQQDMfmv4ePpdecx+niSNVoEARsFxtb2hFYDe8+OGD1ekturUAuD8bwsaa7cQgDVOe8UggD1mrB1DANY47RWDAPaYsXYMAVjjtFcMAthjxtoxBGCN014xCGCPGWvHEIA1TnvFIIA9ZqwdQwDWOO0VgwD2mLF2DAFY47RXDALYY8baMQRgjdNeMQhgjxlrxxCANU57xSCAPWasHUMA1jjtFYMA9pixdgwBWOO0VwwC2GPG2jEEYI1zWrG7xz/u20P9izzc3d/f7tPrs/rfH5vnadXiXg0B4nJL3ovAf23gPy9GIkhJAAGSUU4vcHH/o57xfQ8pCSDAdH5Je4yBHwa4fvvBnZ68TBpvaGcIMJQQ4/Yp8GnY0xev3PWb94wdtEtBgKzx7opPhQ8BhMBIDBMDP/T1+O5z1haxAmSN17kU+BIXghAgowAp8KktCJARTu7SFuBTBlgBMpiQCl/i6j8cNgRgFsASfKwAhcOHAIwCWJv5OAUAfp0ArgESRbA687ECJIKn3a3DxwqQIMES4EOASAGWAh8CRAiwJPgQYKIAS4MPASYIsET4EGCkAEuFDwFGCLBk+OICaPgc/Ajm25csHb6oAFo+Bz9WgBLgiwnQBz8AkfwZ+JAEpcAXEWAMfE0SlARfnQDU0JwrQWnwRQQ4+fllaMVtbZ9DghLhiwgQG6ykBLE9ajp1TZ5lzQ7ZPw+QEq6EBCn9zX3KioW+v192Aei9/8Wv79G95pSgdPgipwAaZMo7gS5TckgA+E9JZ18BAlBNgWvqJXppZNpRTADqV0PwGnpgYsdSRlSAuSUA/LYz4gLMJQHgdy8YswggLQHgHz9bzCaAlASA33+pMKsAuSUA/OHrxNkFyCUB4A/DF70PMNQOJzDOWkN9W9+uYgXgvFlEtYZ+CWMftBx3HTVLokoAjtNBStilwVd1CtgHl7qEx0hQIny1AkivBKXCVy2AlAQlw1cvQG4JSodvQoBcEgD+05WSuncBxy7gOC8MAX+XshkBuFYCwD+cYqYESJUA8NvrqzkBYiUA/O6Tq0kBpkoA+MdvjZkVYKwEgN9/X9S0AHRofR85B/zhm+LmBQgS0DP9J5TwoL+7l/svbg3Hq/8VixBAf8x6O4QAetmIdAYBRGLWOwgE0MtGpDMIIBKz3kEggF42Ip1BAJGY9Q4CAfSyEekMAojErHcQCKCXjUhnEEAkZr2DQAC9bEQ6gwAiMesdBALoZSPSGQQQiVnvIBBALxuRziCASMx6B4EAetmIdAYBRGLWOwgE0MtGpDMIIBKz3kEggF42Ip1BAJGY9Q4CAfSyEekMAojErHcQEuDGOXeut0V0ljGBDQTImK6B0msSgGY/rQJ4lJcABCiP+e6IPT3oS1wHFKnB+j/+qyAATgOFORAmfy1AswpAgnIkqGc/He5WgEYC+uZlOTkUeaRb+C0BIMHihVh57zf7R3mwAuxvqKoKq8FyfCDoNPMP4HeuAM+PuRGBvn2GO4ZmjAig1zXkDvDhSP4BcLDmrm+X+ucAAAAASUVORK5CYII=';
    const output = await haapiAuthorizer.authorizeWithBankID(receivedAccessToken, session);
    if (output.success) {
        const structuredContent = {
            authMessage: {
                message: output.message,
                qrCode: output.qrCode
            }
        };
        return {
            // The structuredContent should be exactly the same as the unstructured content
            // according to https://modelcontextprotocol.io/specification/2025-06-18/server/tools#structured-content
            // We do not include the image in the output the LLM will see, to avoid bloating the LLM context.
            content: [
                { type: 'text', annotations: { audience: ['user'] }, text: JSON.stringify(structuredContent) } as any,
                { type: 'image', data: output.qrCode || checkMark, mimeType: 'image/png', annotations: { audience: ['user']} } as any,
                { type: 'text', annotations: { audience: ['assistant'] }, text: 'Show the user the response from this tool and ask them to confirm when they approved authorization. Once the user approves, run the initial tool again.'} as any
            ],
            structuredContent,
        };
    }
    const structuredContent = { success: false, authMessage: { message: output.message, qrCode: null }};
    return {
        content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
        structuredContent,
    };
}

/*
 * Create the Express application
 */
const app = express();

/*
 * Use Express to serve the ChatGPT widget's web content
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../../web')));

/*
 * Add general middleware
 */
app.use(morgan('combined'));
app.use(express.json());

/*
 * Serve MCP resource metadata
 */
app.get('/.well-known/oauth-protected-resource', (request: Request, response: Response) => {

    const metadata = {
        resource: `${configuration.externalBaseUrl}/`,
        resource_name: 'MCP Server',
        authorization_servers: [configuration.authorizationServerBaseUrl],
        scopes_supported: [configuration.requiredScope],
    };

    response.setHeader('content-type', 'application/json');
    response.status(200).send(JSON.stringify(metadata));
});

/*
 * For all other routes, apply OAuth validation
 */
app.use('/', oauthFilter.execute);

/*
 * Do the MCP boiler plate setup
 */
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
app.post('/', async (request: Request, response: Response) => {

    const sessionId = request.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;
    if (sessionId && transports[sessionId]) {
      
        transport = transports[sessionId];

    } else {
      
        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => sessionManager.createSession(response.locals.claims).id,
            onsessioninitialized: (sessionId) => {
                console.log(`>>> Session initialized: ${sessionId}`);
                transports[sessionId] = transport;
            },
        });

        transport.onclose = () => {

            if (transport.sessionId) {
                console.log(`>>> Session closed: ${transport.sessionId}`);
                delete transports[transport.sessionId];
                sessionManager.deleteSession(transport.sessionId);
            }
        };

        await server.connect(transport);
    }

    await transport.handleRequest(request, response, request.body);
});

const handleSessionRequest = async (request: Request, response: Response) => {

    const sessionId = request.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
        response.status(400).send('Invalid or missing session ID');
        return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(request, response);
};

app.get('/', handleSessionRequest);
app.delete('/', handleSessionRequest);

/*
 * Start listening for requests
 */
app.listen(configuration.port, () => {
    console.log(`🚀 MCP Server listening on http://localhost:${configuration.port} ...`);
});
