Refactor the following code safely: $ARGUMENTS

## Process
1. Research: find all usages and imports of the target code
2. Plan: describe what changes and why — get my approval before touching code
3. If tests are missing for the target code, write them FIRST
4. Execute changes incrementally — run tests after each change
5. Run full check: `cd backend && uv run pytest && uv run ruff check . && uv run pyright`

## Omni Copilot Rules
- Never change LangGraph state schema without a migration plan
- Never change Composio tool signatures without updating the tool registry
- Never change WebSocket message format without updating both backend AND frontend
- If refactoring a tool: verify it still works in the LangGraph graph, not just in isolation
- Show me the diff at each step
