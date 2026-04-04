---
name: git-workflow
description: "When making commits, creating branches, or preparing PRs for Omni Copilot."
---

# Git Workflow — Omni Copilot

## Branch Naming
- `feat/add-notion-integration` — new feature
- `fix/oauth-token-refresh` — bug fix
- `chore/update-composio-sdk` — dependency updates, config changes
- `refactor/extract-tool-registry` — code restructuring
- `test/add-graph-integration-tests` — adding tests

## Commit Format (Conventional Commits)
```
feat: add Notion search tool via Composio
fix: handle expired Google OAuth tokens gracefully
chore: bump langgraph to 0.3.x
refactor: extract tool registration into dedicated service
test: add integration tests for Gmail tool flow
docs: add ADR for caching strategy
```

Include scope when helpful:
```
feat(tools): add Discord messaging tool
fix(frontend): handle WebSocket reconnection on network change
test(agents): add router decision tests for ambiguous queries
```

## PR Checklist
1. Branch is up to date with main
2. All CI checks pass (lint + types + tests + build)
3. PR description explains WHAT changed and WHY
4. If adding integration: include screenshot of working connection flow
5. If changing LangGraph graph: include before/after graph description
6. Squash merge when merging to main
