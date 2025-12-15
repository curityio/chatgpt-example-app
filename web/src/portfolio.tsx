import ReactDOM from "react-dom/client";
import React, {useEffect} from "react";
import {useWidgetState} from "./use-widget-state";
import {useOpenAiGlobal} from "./use-openai-global";


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

const compareArrays = (array1: Stock[], array2: Stock[]): boolean => {
    return array1.length === array2.length && array1.every((stock1, index) => {
        const stock2 = array2[index];
        return stock1.id === stock2.id && stock1.name === stock2.name && stock1.currentPrice === stock2.currentPrice && stock1.quantity === stock2.quantity;
    });
}

const portfoliosDifferent = (portfolioFromTool: unknown | undefined, portfolioFromState: Stock[] | undefined): boolean => {
    if (portfolioFromTool && portfolioFromState) {
        return !compareArrays(portfolioFromTool as Stock[], portfolioFromState);
    }

    return !!portfolioFromTool;
}

const PortfolioApp: React.FC = () => {
    const toolOutput = useOpenAiGlobal('toolOutput');
    const [widgetState, setWidgetState] = useWidgetState(() => ({
        portfolio : toolOutput?.result as Stock[],
        authMessage: toolOutput?.authMessage as any,
        tool: null as Tool | null
    }));

    useEffect(() => {
        console.log('>>> Current tool output', toolOutput);
        // It seems that once the tool output from window.openai is set it doesn't change. If I understand things correctly, when chatGPT contiunes the conversation
        // and makes another tool call on its own, then it will start a new instance of the widget, which will then get a new value in toolOutput.
        // This why I'm overriting the widget's state with the tool's response only when it is empty — so only when the widget is spun up.
        // Again, this is my understanding of this, I might be wrong ;)

        if (toolOutput?.result && !widgetState?.portfolio) {
            setWidgetState({
                ...widgetState,
                portfolio: toolOutput?.result as Stock[],
                authMessage: toolOutput?.authMessage
            });
        }

        // Originally, I tried this approach, but it kept overwriting the state with the initial tool output whenever I changed it from the widget itself.
        // So you could buy some stocks clicking on the widget, but it would overwrite the state with the initial quantity.

        // const portfoliosAreDifferent = portfoliosDifferent(toolOutput?.result, widgetState?.portfolio);
        // const authMessageDifferent = toolOutput?.authMessage && widgetState?.authMessage != toolOutput?.authMessage

        // if (portfoliosAreDifferent || authMessageDifferent) {
        //     console.log('>>> Found differences ', portfoliosAreDifferent, authMessageDifferent);
        //     console.log('>> Setting portfolios in state');
        //     console.log('AuthMessage in state ', widgetState?.authMessage);
        //
        //     setWidgetState({
        //         ...widgetState,
        //         portfolio: toolOutput?.result as Stock[],
        //         authMessage: toolOutput?.authMessage
        //     });
        // }
    }, [toolOutput]);

    const pollAuthentication = async (originalTool: Tool) => {
        console.log('>>> Current widget state ', widgetState);
        // Wait 1 second before polling
        await setTimeout(() => Promise.resolve(), 1000);

        const toolResult = await window.openai?.callTool('continue_authorization', { });

        console.log('>>> Result of polling ', toolResult);

        if (toolResult.structuredContent.authMessage?.message === 'Authentication finished') { // TODO — maybe this should use a code or a separate field instead?
            // Invoke the original tool again
            const originalToolResult = await window.openai?.callTool(originalTool.name, { id: originalTool.parameters.id, quantity: originalTool.parameters.delta });

            if (originalToolResult?.structuredContent?.result) {
                // Update the stock in state
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

            if (!toolResult?.structuredContent?.authMessage?.message.startsWith('Authorization failed')) {
                pollAuthentication(originalTool);
            }
        }
    }

    const buyStock = async (id: string, delta: number) => {
        const toolToCall = {
            name: 'buy_stock',
            parameters: { id, delta }
        }

        updateStock(toolToCall, id, delta);
    }

    const sellStock = async (id: string, delta: number) => {
        const toolToCall = {
            name: 'sell_stock',
            parameters: { id, delta }
        }

        updateStock(toolToCall, id, delta);
    }

    const updateStock = async (toolToCall: Tool, id: string, delta: number) => {

        const updateStockResult = await window.openai?.callTool(toolToCall.name, { id, quantity: delta });
        console.log(`>>> Result of call to ${toolToCall.name} `, updateStockResult);

        const newState = {} as any;

        if (updateStockResult?.structuredContent?.result) {
            // Update the stock in state
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

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<PortfolioApp />);
