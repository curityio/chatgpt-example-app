import ReactDOM from "react-dom/client";
import React, {useState} from "react";
import {useWidgetState} from "./use-widget-state";
import {useOpenAiGlobal} from "./use-openai-global";
import {UnknownObject} from "./types";

type Todo = {
    id: string,
    task: string,
    completed: boolean
}

type Tool = {
    name: string,
    parameters: {
        id: string
    }
}

const TodoApp: React.FC<{ toolResponse: UnknownObject | null }> = ({ toolResponse }) => {
    const [widgetState, setWidgetState] = useWidgetState(() => ({
        todoList : toolResponse?.result as Todo[],
        authMessage: toolResponse?.authMessage as any,
        tool: null as Tool | null
    }));

    const pollAuthentication = async () => {
        // Wait 2 seconds before polling
        await setTimeout(() => Promise.resolve(), 1000);

        const toolResult = await window.openai?.callTool('continue_authorization', { });

        if (toolResult.authMessage?.message === 'Authentication finished') { // TODO — maybe this should use a code or a separate field instead?
            // Invoke the original tool again
            const originalToolResult = await window.openai?.callTool(widgetState.tool?.name!, { id: widgetState.tool?.parameters.id! });
            setWidgetState({
                ...widgetState,
                todoList: originalToolResult?.result as Todo[] || widgetState.todoList,
                authMessage: null,
                tool: null
            });
        }

        setWidgetState({
            ...widgetState,
            authMessage: toolResult?.authMessage,
        });

        pollAuthentication();
    }

    const updateTodo = async (id: string, checked: boolean) => {
        const updatedList = widgetState.todoList.map(todo =>
            todo.id === id ? { ...todo, completed: checked } : todo
        );

        setWidgetState({
            ...widgetState,
            todoList: updatedList
        });

        const toolName = checked ? 'complete_todo' : 'uncomplete_todo';
        const todoUpdateResult = await window.openai?.callTool(toolName, { id });

        setWidgetState({
            ...widgetState,
            todoList: todoUpdateResult?.result as Todo[] || widgetState.todoList,
            authMessage: todoUpdateResult?.authMessage,
            tool: {
                name: toolName,
                parameters: {
                    id
                }
            }
        });

        if (todoUpdateResult?.authMessage) {
            pollAuthentication();
        }
    }

    return (<div>
        {widgetState.authMessage && <div>
            <p>{widgetState.authMessage.message}</p>
            {widgetState.authMessage.qrCode && <img src={`data:image/png;base64,${widgetState.authMessage.qrCode}`} alt="QR Code" />}
        </div>}

        {widgetState.todoList.map(todo => (
            <div key={todo.id}>

                <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={e => updateTodo(todo.id, e.target.checked)}
                />
                <label style={{ marginLeft: '8px' }}>{todo.task}</label>
            </div>
        ))}
    </div>);
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<TodoApp toolResponse={useOpenAiGlobal("toolOutput")} />);
