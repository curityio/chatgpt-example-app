import { CallToolResult } from "@modelcontextprotocol/sdk/types";
import apiConfig from '../config.json';

export async function getTodos(): Promise<CallToolResult> {
  console.log('Fetching todos from', apiConfig.apiUrl);
  const response = await fetch(apiConfig.apiUrl);

  const authError = resultIfAuthorizationError(response);
  if (authError) {
    return authError;
  }

  if (response.status !== 200) {
    throw new Error('Failed to fetch todos');
  }
  const todos = await response.json();
  const output = { result: JSON.stringify(todos) };
  return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output };
}

export async function setTodoCompletion(id: string, completed: boolean): Promise<CallToolResult> {
  const response = await fetch(`${apiConfig.apiUrl}/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ completed: true }),
    headers: { 'Content-Type': 'application/json' }
  });

  const authError = resultIfAuthorizationError(response);
  if (authError) {
    return authError;
  }

  if (response.status !== 200) {
    throw new Error('Failed to toggle todo');
  }
  const result = await response.json();
  return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: { result } };
}

function resultIfAuthorizationError(response: Response): CallToolResult | null {
  if (response.status >= 400 && response.status < 500) {
    const errorMessage = 'User must obtain authorization to call this tool';
    return {
      content: [{ type: 'text', text: errorMessage }],
      isError: true
    };
  }
  return null;
}

