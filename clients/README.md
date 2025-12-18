# Test Clients

Test clients provide additional options for debugging and to ensure interoperability.\
See the [Test Clients Resources](https://github.com/curityio/mcp-authorization-secured-api/tree/main/clients) from the original Curity MCP repository for further details on technical testing.

## TypeScript SDK Usage

You can test server operations with the TypeScript SDK and the following syntax:

```bash
call get_portfolio
call buy_stock {"id": "MSFT", "quantity": 1}
call sell_stock {"id": "MSFT", "quantity": 1}
```

## MCP Inspector

Use the MCP inspector to visualize MCP requests and responses.
