Run the pre-ship checklist for current changes on Omni Copilot.

## Checklist
1. `git status` — review what's changed
2. `cd backend && uv run ruff check .` — no Python lint errors
3. `cd backend && uv run ruff format --check .` — Python is formatted
4. `cd backend && uv run pyright` — type-check passes
5. `cd backend && uv run pytest` — all backend tests pass
6. `cd frontend && pnpm lint` — no TypeScript lint errors
7. `cd frontend && pnpm build` — frontend builds successfully
8. `cd frontend && pnpm test` — all frontend tests pass
9. No `.env` values, API keys, or secrets in diff (`git diff | grep -iE 'api_key|secret|token|password'`)
10. No `print()` statements in backend diff (use `structlog` instead)
11. No `console.log` in frontend diff (except in development blocks)
12. Commit message follows conventional commits format

## Output
- Pass/fail for each step with details on failures
- If all pass: suggest the commit message and ask if I should commit
