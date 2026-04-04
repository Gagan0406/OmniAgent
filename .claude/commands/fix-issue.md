Fix the following issue: #$ARGUMENTS

## Process
1. Read the issue description from GitHub (or from what I describe)
2. Use the researcher agent to find relevant code across backend/ and frontend/
3. Write a failing test that reproduces the issue
4. Implement the fix — smallest possible change
5. Verify: failing test now passes, no regressions with full test suite
6. Format: `cd backend && uv run ruff format .` or `cd frontend && pnpm format`
7. Prepare a commit: `fix: <description> (closes #$ARGUMENTS)`

## Rules
- Understand root cause before fixing symptoms
- If the fix touches the LangGraph graph, test the full agent flow
- If the fix touches Composio integration, test with mocked OAuth tokens
