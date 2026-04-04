Review the current uncommitted changes (or the changes in $ARGUMENTS if a branch/file is specified).

## Process
1. Run `git diff` (or `git diff $ARGUMENTS`) to see all changes
2. Use the code-reviewer agent for systematic review
3. Run backend checks: `cd backend && uv run ruff check . && uv run pyright`
4. Run frontend checks: `cd frontend && pnpm lint`
5. Summarize findings

## Omni Copilot Specific Checks
- New tools registered in `backend/app/tools/__init__.py`?
- Composio tools have error handling for expired tokens?
- LangGraph state changes are additive (no breaking state schema changes)?
- No API keys, tokens, or secrets in the diff?
- WebSocket messages follow the established schema?
- New endpoints have Pydantic request/response models?

## Output
- Structured review with severity levels: critical | warning | suggestion | nit
- Overall verdict: SHIP IT / NEEDS FIXES / NEEDS DISCUSSION
