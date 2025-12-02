import { CallToolResult } from "@modelcontextprotocol/sdk/types";
import Configuration from "./configuration";

const config = new Configuration();

export async function getPortfolio(token: string): Promise<CallToolResult> {
  console.log('Fetching portfolio from', config.apiUrl);
  const response = await fetch(config.apiUrl, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  });

  const authError = resultIfAuthorizationError(response);
  if (authError) {
    return authError;
  }

  if (response.status !== 200) {
    throw new Error('Failed to fetch portfolio');
  }
  const portfolio = await response.json();
  const output = { result: portfolio };
  return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output };
}

export async function buyOrSellStock(id: string, delta: number, token: string): Promise<CallToolResult> {
  const response = await fetch(`${config.apiUrl}/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ delta }),
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  });

  const authError = resultIfAuthorizationError(response);
  if (authError) {
    return authError;
  }

  if (response.status !== 200) {
    throw new Error('Failed to buy or sell stocks');
  }
  const result = await response.json();
  return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: { result } };
}

function resultIfAuthorizationError(response: Response): CallToolResult | null {
  if (response.status >= 400 && response.status < 500) {
    const errorMessage = 'User must obtain authorization to call this tool';
    return {
      content: [{ type: 'text', text: errorMessage }],
      isError: true,
      structuredContent: { result: [] }
    };
  }
  return null;
}

