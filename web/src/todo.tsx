import React, { useState, useEffect } from 'react';
import { Todo, TodoController, ApiTodoController, TestTodoController } from './controller';

interface TodoAppProps {
    useTestController?: boolean;
}

export const TodoApp: React.FC<TodoAppProps> = ({ useTestController = false }) => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [todoController] = useState<TodoController>(
        useTestController ? new TestTodoController() : new ApiTodoController()
    );

    useEffect(() => {
        fetchTodos();
    }, []);

    const fetchTodos = async () => {
        try {
            setLoading(true);
            const data = await todoController.getTodos();
            setTodos(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const toggleTodo = async (id: string) => {
        try {
            const todo = todos.find(t => t.id === id);
            if (!todo) return;

            const updatedTodo = await todoController.setTodoCompletion(id, !todo.completed);
            setTodos(todos.map(t => 
                t.id === id ? updatedTodo : t
            ));
        } catch (err) {
            console.error('Failed to update todo:', err);
        }
    };

    if (loading) return <div className="loading">Loading todos...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="todo-app">
            <h2>Todo App</h2>
            <p style={{ fontSize: '0.9em', color: '#666', fontStyle: 'italic' }}>
                Using {useTestController ? 'Test' : 'API'} Controller
            </p>
            <h3 className='todo-header'>Here are your tasks:</h3>
            <div className='todo-tasks'>
            {todos.length === 0 ? (
                <p>No todos found</p>
            ) : (
                <ul className="todo-list">
                    {todos.map(todo => (
                        <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                            <input
                                className="todo-checkbox"
                                type="checkbox"
                                checked={todo.completed}
                                onChange={() => toggleTodo(todo.id)}
                            />
                            <div className="todo-text">
                                <h3>{todo.task}</h3>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            </div>
        </div>
    );
};
