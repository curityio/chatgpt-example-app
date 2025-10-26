import React, { useState, useEffect } from 'react';

interface Todo {
    id: string;
    task: string;
    completed: boolean;
}

export const TodoApp: React.FC = () => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTodos();
    }, []);

    const fetchTodos = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/todos');
            if (!response.ok) {
                throw new Error('Failed to fetch todos');
            }
            const data = await response.json();
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

            const response = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ completed: !todo.completed }),
            });

            if (response.ok) {
                setTodos(todos.map(t => 
                    t.id === id ? { ...t, completed: !t.completed } : t
                ));
            }
        } catch (err) {
            console.error('Failed to update todo:', err);
        }
    };

    if (loading) return <div className="loading">Loading todos...</div>;
    if (error) return <div className="error">Error: {error}</div>;

    return (
        <div className="todo-app">
            <h2>Todo App</h2>
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
