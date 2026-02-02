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

import {FC, useEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {useWidgetState} from './use-widget-state';
import {useOpenAiGlobal} from './use-openai-global';
import {CallToolResponse, CurityPortfolioWidgetState, Tool, ToolError} from './types';

const PortfolioApp: FC = () => {

    // OpenAI provides the output of the tool that invoked the widget
    const toolOutput = useOpenAiGlobal('toolOutput');
    // console.log('>>> Received toolOutput: ', toolOutput);

    const defaultState = {
        portfolio: toolOutput?.portfolio,
        updatedStock: toolOutput?.updatedStock,
        authMessage: toolOutput?.authMessage,
        error: toolOutput?.error as ToolError,
    } as CurityPortfolioWidgetState;

    // Ask OpenAI to store data across invocations of the widget
    const [widgetState, setWidgetState] = useWidgetState(defaultState);
    //console.log('>>> Received widgetState: ', widgetState);

    const shouldPoll = useRef<boolean>(false);

    // If OpenAI hooks supply null widget state, set state to force a re-render
    if (!widgetState) {
        setWidgetState(defaultState);
    }

    /*
     * Initiate the MCP tool to buy stocks
     */
    const buyStock = async (id: string, delta: number) => {
        const toolToCall = {
            toolName: 'buy_stock',
            parameters: { id, delta }
        }

        updateStock(toolToCall, id, delta);
    }

    /*
     * Initiate the MCP tool to sell stocks
     */
    const sellStock = async (id: string, delta: number) => {
        const toolToCall = {
            toolName: 'sell_stock',
            parameters: { id, delta }
        }

        updateStock(toolToCall, id, delta);
    }

    const getPortfolio = async () => {
        const portfolioToolResult = await callTool('get_portfolio', {});

        setWidgetState({
            ...widgetState,
            portfolio: portfolioToolResult.structuredContent.portfolio,
            updatedStock: undefined,
            authMessage: undefined,
        });
    }

    /*
     * Initiate buying or selling
     */
    const updateStock = async (toolToCall: Tool, id: string, delta: number) => {

        // console.log(`>>> updateStock for ${toolToCall.toolName}`);
        let updateStockResult: CallToolResponse;
        const newState = {} as any;

        updateStockResult = await callTool(toolToCall.toolName, { id, quantity: delta });
        //console.log('>>> updateStock result');
        //console.log(updateStockResult);

        // Handle errors if required
        newState.error = updateStockResult.structuredContent?.error;
        shouldPoll.current = false;
        if (!newState.error) {

            // Handle the step-up response that begins polling
            if (updateStockResult.structuredContent?.authMessage) {
                newState.authMessage = updateStockResult.structuredContent.authMessage;
                shouldPoll.current = true;
            }
        }

        //console.log('>>> updateStock new widget state');
        //console.log(newState);
        setWidgetState({
            ...widgetState,
            ...newState
        });
    }

    /*
     * Poll BankID and then complete the transaction
     */
    const pollAuthentication = async () => {

        // console.log('>>> pollAuthentication step');
        const timeout = (ms: number) => {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        await timeout(1000);

        // Call the MCP polling operation once per second
        const toolResult = await callTool('continue_authorization', { });
        // console.log('>>> pollAuthentication result');
        // console.log(toolResult);

        // Handle errors if required
        const newState = {} as any;
        newState.error = toolResult.structuredContent?.error;
        if (!newState.error) {

            if (toolResult.structuredContent?.authMessage?.message === 'authentication_success') {

                const originalTool = toolResult.structuredContent?.continueOperation

                if (!originalTool?.toolName) {
                    newState.error = {
                        status: 500,
                        code: 'missing_required_attributes',
                        message: 'Cannot continue operation'
                    }
                } else {
                    // On success, invoke the original buy / sell tool again, to use the high privilege access token
                    // Maybe the MCP server could actually do it?
                    const originalToolResult = await callTool(originalTool.toolName, { id: originalTool.parameters.id, quantity: originalTool.parameters.delta });

                    newState.error = originalToolResult.structuredContent?.error;
                    if (!newState.error) {

                        // Get the updated portfolio balance and add it to the state
                        if (originalToolResult.structuredContent?.updatedStock) {

                            const stockToUpdate = originalToolResult.structuredContent.updatedStock;
                            newState.portfolio = widgetState?.portfolio?.map(stock => {
                                if (stock.id === stockToUpdate.id) {
                                    return stockToUpdate;
                                }

                                return stock;
                            });
                            newState.updatedStock = originalToolResult.structuredContent.updatedStock;
                            newState.authMessage = undefined;
                            shouldPoll.current = false;
                        }
                    }
                }
            } else {

                // During step-up authentication, show an updated animated QR code
                newState.authMessage = toolResult?.structuredContent?.authMessage;
                shouldPoll.current = toolResult?.structuredContent?.authMessage?.message !== 'authentication_failure';
            }
        }

        // console.log('>>> pollAuthentication new widget state');
        // console.log(newState);
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
                    continueAuthorization: false
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
    // console.log('>>> Rendering widgetState: ', widgetState);
    const hasError = !!widgetState?.error;
    const showAuthMessage = !!widgetState?.authMessage;
    const hasPortfolio = !!widgetState?.portfolio;
    const hasOnlyUpdatedStock = !hasPortfolio && !!widgetState?.updatedStock;
    const showPortfolio = hasPortfolio && !showAuthMessage;

    // Track the last toolOutput that triggered polling
    const lastPolledToolOutputRef = useRef<any>(null);

    useEffect(() => {
        if (shouldPoll.current) {
            shouldPoll.current = false;
            pollAuthentication();
        }
    }, [shouldPoll.current]);

    useEffect(() => {
        // Initiate polling when there is a new toolOutput that asks for polling.
        if (toolOutput && lastPolledToolOutputRef.current !== toolOutput && toolOutput.continueAuthorization) {
            shouldPoll.current = true;
        }
    }, [toolOutput]);

    return (<div className="widget_content">
        {hasError && <div className="error">{errorDisplayMessage()}</div>}

        {!hasError && showAuthMessage && <div className="auth_message">
            <p>{widgetState.authMessage!.message}</p>
            <img src={`data:image/png;base64,${widgetState.authMessage!.qrCode}`} alt="QR Code" />
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

        {hasOnlyUpdatedStock && <div>
            <h3>Your updated position for {widgetState.updatedStock!.id}</h3>
            <p>
                <span className="stock_name"><span className="ticker">{widgetState.updatedStock!.id}</span>: {widgetState.updatedStock!.name}</span><span className="currently_at">, currently at </span><span className="price">{widgetState.updatedStock!.currentPrice}</span> <span className="currency">USD</span>.
            </p>
            <p className="quantity">You own: <span>{widgetState.updatedStock!.quantity}</span></p>
            <p>
                <button className="button" onClick={() => {getPortfolio()}}>Show full portfolio</button>
            </p>
        </div>
        }
    </div>);
}

// If the widget downloads multiple times, only load it into the DOM once
let container = null;
if (!container) {
    container = document.getElementById('root') as HTMLElement;
    const root = createRoot(container);
    root.render(<PortfolioApp />);
}
