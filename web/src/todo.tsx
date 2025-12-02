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

const compareArrays = (array1: Todo[], array2: Todo[]): boolean => {

    console.log('Array lengths ', array1.length, array2.length);

    return array1.length === array2.length && array1.every((element, index) => {
        const todo2 = array2[index];
        return element.id === todo2.id && element.task === todo2.task && element.completed === todo2.completed;
    });
}

const todoListsDifferent = (todoListFromTool: unknown | undefined, todoListFromState: Todo[] | undefined): boolean => {
    if (todoListFromTool && todoListFromState) {
        return !compareArrays(todoListFromTool as Todo[], todoListFromState);
    }

    return !!todoListFromTool;
}

const TodoApp: React.FC = () => {
    const toolOutput = useOpenAiGlobal('toolOutput');
    const [widgetState, setWidgetState] = useWidgetState(() => ({
        todoList : toolOutput?.result as Todo[],
        authMessage: toolOutput?.authMessage as any,
        tool: null as Tool | null
    }));

    useEffect(() => {
        console.log('>>> Current tool output', toolOutput);

        const todoListsAreDifferent = todoListsDifferent(toolOutput?.result, widgetState?.todoList);
        const authMessageDifferent = toolOutput?.authMessage && widgetState?.authMessage != toolOutput?.authMessage

        if (todoListsAreDifferent || authMessageDifferent) {
            console.log('>>> Found differences ', todoListsAreDifferent, authMessageDifferent);
            console.log('>> Setting todos in state');
            console.log('AuthMessage in state ', widgetState?.authMessage);

            setWidgetState({
                ...widgetState,
                todoList: toolOutput?.result as Todo[],
                authMessage: toolOutput?.authMessage
            });
        }
    }, [toolOutput]);

    const pollAuthentication = async (originalTool: Tool) => {
        console.log('>>> Current widget state ', widgetState);
        // Wait 1 second before polling
        await setTimeout(() => Promise.resolve(), 1000);

        const toolResult = await window.openai?.callTool('continue_authorization', { });

        console.log('>>> Result of polling ', toolResult);

        if (toolResult.structuredContent.authMessage?.message === 'Authentication finished') { // TODO — maybe this should use a code or a separate field instead?
            // Invoke the original tool again
            const originalToolResult = await window.openai?.callTool(originalTool.name, { id: originalTool.parameters.id });
            setWidgetState({
                ...widgetState,
                todoList: originalToolResult?.structuredContent.result as Todo[] || widgetState?.todoList || [],
                authMessage: null,
                tool: null
            });
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

    const updateTodo = async (id: string, checked: boolean) => {
        console.log('>>> Parameters of the event ', id, checked);
        console.log('>>> Current list in widget ', widgetState?.todoList)
        const updatedList = widgetState?.todoList.map(todo =>
            todo.id === id ? { ...todo, completed: checked } : todo
        );

        console.log('>>> Updated list ', updatedList);


        const toolName = checked ? 'complete_todo' : 'uncomplete_todo';

        if (updatedList) {
            setWidgetState({
                ...widgetState,
                todoList: updatedList
            });

        }

        const todoUpdateResult = await window.openai?.callTool(toolName, { id });
        console.log('>>> Result of updating the todo ', todoUpdateResult);

        if (todoUpdateResult?.structuredContent?.authMessage) {
            setWidgetState({
                ...widgetState,
                authMessage: todoUpdateResult?.structuredContent.authMessage
            });

            const originalTool = {
                name: toolName,
                parameters: {
                    id
                }
            }

            pollAuthentication(originalTool);
        }
    }

    const showTodoList = widgetState?.todoList?.length > 0;
    console.log('Show todo list? ', showTodoList);
    console.log('>>> Current widget state ', widgetState);
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
