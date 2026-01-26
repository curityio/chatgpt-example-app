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

import {FC} from 'react';
import {createRoot} from 'react-dom/client';
import {useWidgetState} from './use-widget-state';
import {useOpenAiGlobal} from './use-openai-global';
import {CallToolResponse, ToolError} from './types';

type Stock = {
    id: string,
    name: string,
    currentPrice: number,
    quantity: number
}

type Tool = {
    name: string,
    parameters: {
        id: string,
        delta: number
    }
}

const PortfolioApp: FC = () => {

    // OpenAI provides the output of the tool that invoked the widget
    const toolOutput = useOpenAiGlobal('toolOutput');
    console.log('>>> Received toolOutput: ', toolOutput);

    const defaultState = {
        portfolio: toolOutput?.result as Stock[],
        authMessage: toolOutput?.authMessage as any,
        error: toolOutput?.error as ToolError,
        tool: null as Tool | null,
    };

    // Ask OpenAI to store data across invocations of the widget
    const [widgetState, setWidgetState] = useWidgetState(defaultState);
    console.log('>>> Received widgetState: ', widgetState);

    // If OpenAI hooks supply null widget state, set state to force a re-render
    if (!widgetState) {
        setWidgetState(defaultState);
    }

    /*
     * Initiate the MCP tool to buy stocks
     */
    const buyStock = async (id: string, delta: number) => {
        const toolToCall = {
            name: 'buy_stock',
            parameters: { id, delta }
        }

        updateStock(toolToCall, id, delta);
    }

    /*
     * Initiate the MCP tool to sell stocks
     */
    const sellStock = async (id: string, delta: number) => {
        const toolToCall = {
            name: 'sell_stock',
            parameters: { id, delta }
        }

        updateStock(toolToCall, id, delta);
    }

    /*
     * Initiate buying or selling
     */
    const updateStock = async (toolToCall: Tool, id: string, delta: number) => {

        console.log(`>>> updateStock for ${toolToCall.name}`);
        let updateStockResult: CallToolResponse;
        const newState = {} as any;

        updateStockResult = await callTool(toolToCall.name, { id, quantity: delta });
        console.log('>>> updateStock result');
        console.log(updateStockResult);

        // Handle errors if required
        newState.error = updateStockResult.structuredContent?.error;
        if (!newState.error) {

            // Handle the step up response that begins polling
            if (updateStockResult.structuredContent?.authMessage) {
                newState.authMessage = updateStockResult.structuredContent.authMessage;
                pollAuthentication(toolToCall);
            }
        }

        console.log('>>> updateStock new widget state');
        console.log(newState);
        setWidgetState({
            ...widgetState,
            ...newState
        });
    }

    /*
     * Poll BankID and then complete the transaction
     */
    const pollAuthentication = async (originalTool: Tool) => {

        console.log('>>> pollAuthentication');
        const timeout = (ms: number) => {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        await timeout(1000);

        // Call the MCP polling operation once per second
        const toolResult = await callTool('continue_authorization', { });
        console.log('>>> pollAuthentication result');
        console.log(toolResult);

        // Handle errors if required
        const newState = {} as any;
        newState.error = toolResult.structuredContent?.error;
        if (!newState.error) {

            if (toolResult.structuredContent?.authMessage?.message === 'authentication_success') {
                
                // On success, invoke the original buy / sell tool again, to use the high privilege access token
                const originalToolResult = await callTool(originalTool.name, { id: originalTool.parameters.id, quantity: originalTool.parameters.delta });
                console.log('>>> original tool result');
                console.log(originalToolResult);
                newState.error = originalToolResult.structuredContent?.error;
                if (!newState.error) {
                
                    // Get the updated portfolio balance and add it to the state
                    if (originalToolResult.structuredContent?.result) {
                        
                        const stockToUpdate = originalToolResult.structuredContent.result as Stock;
                        const updatedPortfolio = widgetState?.portfolio?.map(stock => {
                            if (stock.id === stockToUpdate.id) {
                                return stockToUpdate;
                            }

                            return stock;
                        });

                        console.log('>>> pollAuthentication: updated widget state after step-up completion');
                        newState.portfolio = updatedPortfolio!;
                        newState.authMessage = undefined;
                        newState.tool = null;
                    }
                }

            } else {
                
                // During step-up authentication, show an updated animated QR code
                console.log('>>> pollAuthentication: update widget state with animated QR code');
                newState.authMessage = toolResult?.structuredContent?.authMessage;
                if (toolResult?.structuredContent?.authMessage?.message !== 'authentication_failure') {
                    pollAuthentication(originalTool);
                }
            }
        }

        console.log('>>> pollAuthentication new widget state');
        console.log(newState);
        setWidgetState({
            ...widgetState,
            ...newState
        });
    }

    /*
     * Call an MCP tool and handle exceptions
     */
    const callTool = async (name: string, data: any): Promise<CallToolResponse> => {
        
        try {

            return await window.openai?.callTool(name, data);

        } catch (e: any) {

            console.log(`>>> callTool ${name} exception: `, e.message);
            let status = 0;
            let code = 'call_tool_error';
            let message = `Problem encountered calling tool ${name}`;

            // ChatGPT returns a raw string message so defensively dig out the server details of interest
            const errorMessage = e.message as string;
            if (errorMessage) {
                const statusMatch = errorMessage.match(/\"status\":(.+?),/);
                if (statusMatch && statusMatch[1]) {
                    status = Number(statusMatch[1]);
                }

                const codeMatch = errorMessage.match(/\"code\":\"(.+?)\"/);
                if (codeMatch && codeMatch[1]) {
                    code = codeMatch[1];
                }

                const messageMatch = errorMessage.match(/\"message\":\"(.+?)\"/);
                if (messageMatch && messageMatch[1]) {
                    message = messageMatch[1];
                }
            }

            return {
                structuredContent: {
                    error: {
                        status,
                        code,
                        message,
                    },
                },
            };
        }
    }

    /*
     * Format error fields for display
     */
    const errorDisplayMessage = () => {
        
        if (widgetState?.error) {
            
            const parts: string[] = [];
            parts.push(widgetState.error.message);
            if (widgetState.error.status) {
                parts.push(`status: ${widgetState.error.status}`)
            }
            parts.push(`code: ${widgetState.error.code}`)

            return parts.join(', ');
        }

        return '';
    }

    /*
     * Render the widget from state
     */
    console.log('>>> Rendering widgetState: ', widgetState);
    const hasError = !!widgetState?.error;
    const isLoading = !widgetState?.portfolio && !hasError;
    const showAuthMessage = !!widgetState?.authMessage;
    const showPortfolio = !!widgetState?.portfolio && !showAuthMessage;

    return (<div className="widget_content">
        
        {isLoading && <div>Loading...</div>}

        {hasError && <div className="error">{errorDisplayMessage()}</div>}

        {!hasError && showAuthMessage && <div className="auth_message">
            <p>{widgetState.authMessage.message}</p>
            {widgetState.authMessage.qrCode && <img src={`data:image/png;base64,${widgetState.authMessage.qrCode}`} alt="QR Code" />}
        </div>}

        {showPortfolio && widgetState?.portfolio?.map((stock, idx) => (
            <div key={stock.id} className={idx % 2 === 0 ? 'element_even stock' : 'element_odd stock' }>
                <p>
                    <span className="stock_name"><span className="ticker">{stock.id}</span>: {stock.name}</span><span className="currently_at">, currently at </span><span className="price">{stock.currentPrice}</span> <span className="currency">USD</span>.
                </p>
                <p className="quantity">You own: <span>{stock.quantity}</span></p>
                <input type="number" className="delta" defaultValue="1" id={`delta_${stock.id}`} />
                <button className="button buy" onClick={() => {
                    const input = document.getElementById(`delta_${stock.id}`) as HTMLInputElement;
                    const delta = input ? parseInt(input.value, 10) : 1;
                    buyStock(stock.id, delta);
                }}>Buy</button>
                <button className="button sell" onClick={() => {
                    const input = document.getElementById(`delta_${stock.id}`) as HTMLInputElement;
                    const delta = input ? parseInt(input.value, 10) : 1;
                    sellStock(stock.id, delta);
                }}>Sell</button>
            </div>
        ))}
    </div>);
}

// If the widget downloads multiple times, only load it into the DOM once
let container = null;
if (!container) {
    container = document.getElementById('root') as HTMLElement;
    const root = createRoot(container);
    root.render(<PortfolioApp />);
}
