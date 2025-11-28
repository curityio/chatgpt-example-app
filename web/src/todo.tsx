import ReactDOM from "react-dom/client";
import React, {useEffect, useState} from "react";
import {useWidgetState} from "./use-widget-state";
import {useOpenAiGlobal} from "./use-openai-global";


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

const TodoApp: React.FC = () => {
    const toolResponse = useOpenAiGlobal('toolOutput');
    const [widgetState, setWidgetState] = useWidgetState(() => ({
        todoList : (toolResponse?.structuredContent as any)?.result as Todo[],
        authMessage: (toolResponse?.structuredContent as any)?.authMessage as any,
        tool: null as Tool | null
    }));

    useEffect(() => {
        const initialToolResponse = window.openai?.toolOutput;
        console.log('Initial tool output', initialToolResponse);
        if ((initialToolResponse?.structuredContent as any)?.result) {
            console.log('Setting todos');
            setWidgetState({
                ...widgetState,
                todoList: (initialToolResponse?.structuredContent as any)?.result as Todo[]
            })
        } else {
            console.log('Fetching todos');
            window.openai?.callTool('get_todos', {}).then(toolResponse => {
                console.log('Got response from tool', toolResponse)
                setWidgetState({
                    ...widgetState,
                    todoList: toolResponse.structuredContent.result as Todo[]
                });
            });
        }
    }, []);

    const pollAuthentication = async () => {
        // Wait 2 seconds before polling
        await setTimeout(() => Promise.resolve(), 1000);

        const toolResult = await window.openai?.callTool('continue_authorization', { });

        if (toolResult.structuredContent.authMessage?.message === 'Authentication finished') { // TODO — maybe this should use a code or a separate field instead?
            // Invoke the original tool again
            if (widgetState?.tool) {
                const originalToolResult = await window.openai?.callTool(widgetState.tool.name, { id: widgetState.tool.parameters.id });
                setWidgetState({
                    ...widgetState,
                    todoList: originalToolResult?.structuredContent.result as Todo[] || widgetState?.todoList || [],
                    authMessage: null,
                    tool: null
                });
            }
        }

        setWidgetState({
            ...widgetState,
            authMessage: toolResult?.structuredContent.authMessage,
        });

        pollAuthentication();
    }

    const updateTodo = async (id: string, checked: boolean) => {
        const updatedList = widgetState?.todoList.map(todo =>
            todo.id === id ? { ...todo, completed: checked } : todo
        );

        if (updatedList) {
            setWidgetState({
                ...widgetState,
                todoList: updatedList
            });

        }

        const toolName = checked ? 'complete_todo' : 'uncomplete_todo';
        const todoUpdateResult = await window.openai?.callTool(toolName, { id });

        setWidgetState({
            ...widgetState,
            todoList: todoUpdateResult?.structuredContent.result as Todo[] || widgetState?.todoList || [],
            authMessage: todoUpdateResult?.structuredContent.authMessage,
            tool: {
                name: toolName,
                parameters: {
                    id
                }
            }
        });

        if (todoUpdateResult?.structuredContent.authMessage) {
            pollAuthentication();
        }
    }

    const showTodoList = widgetState?.todoList?.length > 0;
    console.log('Show todo list? ', showTodoList);
    console.log('Current todos', widgetState?.todoList);
    const noTodos = !showTodoList;
    const showAuthMessage = !(widgetState?.authMessage === null || widgetState?.authMessage === undefined)

    return (<div>
        {showAuthMessage && <div>
            <p>{widgetState.authMessage.message}</p>
            {widgetState.authMessage.qrCode && <img src={`data:image/png;base64,${widgetState.authMessage.qrCode}`} alt="QR Code" />}
        </div>}

        {showTodoList && widgetState.todoList.map(todo => (
            <div key={todo.id}>

                <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={e => updateTodo(todo.id, e.target.checked)}
                />
                <label style={{ marginLeft: '8px' }}>{todo.task}</label>
            </div>
        ))}
        {noTodos && <div>You have no Todos on your list</div>}
    </div>);
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<TodoApp />);
