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

import React, {useEffect} from 'react';
import ReactDOM from 'react-dom/client';
import {useWidgetState} from './use-widget-state';
import {useOpenAiGlobal} from './use-openai-global';
import {CallToolResponse} from './types';

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

const PortfolioApp: React.FC = () => {

    const toolOutput = useOpenAiGlobal('toolOutput');
    const [widgetState, setWidgetState] = useWidgetState(() => ({
        portfolio : toolOutput?.result as Stock[],
        authMessage: toolOutput?.authMessage as any,
        tool: null as Tool | null,
    }));

    useEffect(() => {
        console.log('>>> Current tool output', toolOutput);
        
        // Once the tool output from window.openai is set it doesn't change.
        // When chatGPT continues the conversation, it seems to start a new widget instance that gets data in toolOutput.
        // Therefore, overwrite the widget's state with the tool's response only when it is empty
        if (toolOutput?.result && !widgetState?.portfolio) {
            setWidgetState({
                ...widgetState,
                portfolio: toolOutput?.result as Stock[],
                authMessage: toolOutput?.authMessage,
            });
        }
    }, [toolOutput]);

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
     * Common update processing
     */
    const updateStock = async (toolToCall: Tool, id: string, delta: number) => {

        let updateStockResult: CallToolResponse
        const newState = {} as any;

        try {

            updateStockResult = await window.openai?.callTool(toolToCall.name, { id, quantity: delta });
            console.log(`>>> Result of call to ${toolToCall.name} `, updateStockResult);
            
        } catch (e: any) {

            setWidgetState({
                ...widgetState,
                authMessage: undefined,
                tool: null,
            });
            return;
        }

        if (updateStockResult?.structuredContent?.result) {

            const stockToUpdate = updateStockResult.structuredContent.result as Stock;
            newState.portfolio = widgetState?.portfolio.map(stock => {
                if (stock.id === stockToUpdate.id) {
                    return stockToUpdate;
                }

                return stock;
            });
        }

        if (updateStockResult?.structuredContent?.authMessage) {
            newState.authMessage = updateStockResult?.structuredContent.authMessage;
            pollAuthentication(toolToCall);
        }

        setWidgetState({
            ...widgetState,
            ...newState
        });
    }
    
    /*
     * Poll BankID for completion
     */
    const pollAuthentication = async (originalTool: Tool) => {
        
        // Wait 1 second before polling
        console.log('>>> Current widget state ', widgetState);
        await setTimeout(() => Promise.resolve(), 1000);

        // Call the MCP polling operation
        const toolResult = await window.openai?.callTool('continue_authorization', { });
        console.log('>>> Result of polling ', toolResult);

        if (toolResult.structuredContent.authMessage?.message === 'authentication_success') {
            
            // On success, invoke the original tool again
            const originalToolResult = await window.openai?.callTool(originalTool.name, { id: originalTool.parameters.id, quantity: originalTool.parameters.delta });
            if (originalToolResult?.structuredContent?.result) {
                
                const stockToUpdate = originalToolResult.structuredContent.result as Stock;
                const updatedPortfolio = widgetState?.portfolio.map(stock => {
                    if (stock.id === stockToUpdate.id) {
                        return stockToUpdate;
                    }

                    return stock;
                });

                setWidgetState({
                    ...widgetState,
                    portfolio: updatedPortfolio,
                    authMessage: undefined,
                    tool: null
                });
            }

        } else {
            setWidgetState({
                ...widgetState,
                authMessage: toolResult?.structuredContent.authMessage,
            });

            if (toolResult?.structuredContent?.authMessage?.message !== 'authentication_failure') {
                pollAuthentication(originalTool);
            }
        }
    }

    /*
     * React rendering from state
     */
    const hasPortfolio = widgetState?.portfolio !== undefined;
    const portfolioNotEmpty = hasPortfolio && widgetState?.portfolio?.length > 0;
    const noPortfolio = !hasPortfolio;
    const portfolioEmpty = hasPortfolio && !portfolioNotEmpty;
    const showAuthMessage = !(widgetState?.authMessage === null || widgetState?.authMessage === undefined);
    const showPortfolio = !showAuthMessage;

    console.log('Is there a portfolio? Are there elements in the portfolio?', hasPortfolio, portfolioNotEmpty);
    console.log('>>> Current widget state ', widgetState);

    return (<div className="widget_content">
        {noPortfolio && <div>Loading...</div>}

        {showAuthMessage && <div className="auth_message">
            <p>{widgetState.authMessage.message}</p>
            {widgetState.authMessage.qrCode && <img src={`data:image/png;base64,${widgetState.authMessage.qrCode}`} alt="QR Code" />}
        </div>}

        {showPortfolio && portfolioEmpty && <div>You don't have any stocks in your portfolio</div>}

        {showPortfolio && portfolioNotEmpty && widgetState.portfolio.map((stock, idx) => (
            <div key={stock.id} className={idx % 2 === 0 ? 'element_even stock' : 'element_odd stock' }>
                <p>
                    <span className="stock_name"><span className="ticker">{stock.id}</span>: {stock.name}</span><span className="currently_at">, currently at </span><span className="price">{stock.currentPrice}</span> <span className="currency">USD</span>.
                </p>
                <p className="quantity">You own: <span>{stock.quantity}</span></p>
                <div>extra vertical content</div>
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
                <span>extra horizontal content</span>
            </div>
        ))}
    </div>);
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<PortfolioApp />);
