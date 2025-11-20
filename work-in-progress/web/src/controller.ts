import { apiBaseUrl } from '../config.json';

export interface Todo {
    id: string;
    task: string;
    completed: boolean;
}

export interface TodoController {
    getTodos(): Promise<Todo[]>;
    setTodoCompletion(id: string, completed: boolean): Promise<Todo>;
}

export class ApiTodoController implements TodoController {
    async getTodos(): Promise<Todo[]> {
        const response = await fetch(`${apiBaseUrl}/api/todos`);
        if (!response.ok) {
            throw new Error('Failed to fetch todos');
        }
        return await response.json();
    }

    async setTodoCompletion(id: string, completed: boolean): Promise<Todo> {
        const response = await fetch(`${apiBaseUrl}/api/todos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ completed }),
        });

        if (!response.ok) {
            throw new Error('Failed to update todo');
        }
        
        return await response.json();
    }
}

export class TestTodoController implements TodoController {
    private todos: Todo[] = [
        {
            id: '1',
            task: 'Learn React and TypeScript',
            completed: false
        },
        {
            id: '2',
            task: 'Build a todo application',
            completed: true
        },
        {
            id: '3',
            task: 'Write unit tests',
            completed: false
        },
        {
            id: '4',
            task: 'Deploy to production',
            completed: false
        }
    ];

    async getTodos(): Promise<Todo[]> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));
        return [...this.todos];
    }

    async setTodoCompletion(id: string, completed: boolean): Promise<Todo> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const todoIndex = this.todos.findIndex(t => t.id === id);
        if (todoIndex === -1) {
            throw new Error(`Todo with id ${id} not found`);
        }
        
        this.todos[todoIndex] = { ...this.todos[todoIndex], completed };
        return { ...this.todos[todoIndex] };
    }
}
