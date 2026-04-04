Generate or update documentation for: $ARGUMENTS

## Rules
- Match existing docs style in the project
- For Python: use Google-style docstrings with type hints
- For TypeScript: use JSDoc with @param and @returns
- For API endpoints: document request/response schemas, auth requirements, WebSocket message format
- For tools: document what the tool does, its parameters, expected Composio scopes needed, and error modes
- For LangGraph nodes: document the state it reads, the state it writes, and the edges it connects to
- Include code examples where helpful
- If documenting architecture: use mermaid diagrams
