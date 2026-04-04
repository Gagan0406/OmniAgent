# Omni Copilot - Build Status

> Update this file at the end of every session. It is the first handoff file for the next session.

## How to Use
At the start of each session, read this file first.
At the end of each session, update it with what changed, what passed, and what is next.

---

## Current Phase: 1B - ChatGroq Router + Composio Wired

## Legend
- [x] Done and tested
- [~] In progress / partial
- [ ] Not started
- [!] Blocked / abandoned

---

## Backend (`backend/`)

### Foundation
| File | Status | Notes |
|------|--------|-------|
| `pyproject.toml` | [x] | Backend dependencies, pytest, ruff, and pyright configured |
| `app/main.py` | [x] | FastAPI app created with `/api/health` and chat router |
| `app/config.py` | [x] | Settings model with workspace root and runtime config |
| `app/db/database.py` | [x] | Placeholder async DB session scaffold added |

### Agent Core
| File | Status | Notes |
|------|--------|-------|
| `app/agents/state.py` | [x] | Minimal LangGraph state defined |
| `app/agents/nodes.py` | [x] | Heuristic router, tool executor, and responder implemented |
| `app/agents/graph.py` | [x] | Compiled LangGraph flow with in-memory checkpointer |
| `app/agents/prompts.py` | [x] | Initial prompt scaffold present |

### Tools
| Tool | Status | Notes |
|------|--------|-------|
| `tools/__init__.py` (registry) | [x] | Custom tool registry wired |
| Gmail (Composio) | [x] | GMAIL_FETCH_EMAILS, SEND, DRAFT wired (needs COMPOSIO_API_KEY) |
| Google Calendar (Composio) | [ ] | |
| Notion (Composio) | [ ] | |
| Slack (Composio) | [ ] | |
| Discord (Composio) | [ ] | |
| Local file tools | [x] | Read, list, and search workspace tools implemented |
| Code analysis tools | [x] | Analyze and grep code tools implemented |
| Image tools | [~] | Placeholder only; not real image inspection yet |

### Services
| File | Status | Notes |
|------|--------|-------|
| `services/composio_service.py` | [ ] | |
| `services/auth.py` | [ ] | |
| `services/memory.py` | [x] | In-memory LangGraph checkpoint helper added |

### API
| Endpoint | Status | Notes |
|----------|--------|-------|
| `api/chat.py` (WebSocket) | [x] | WebSocket chat endpoint implemented |
| `api/auth.py` | [ ] | |
| `api/connections.py` | [ ] | |

### Models
| File | Status | Notes |
|------|--------|-------|
| `models/user.py` | [ ] | |
| `models/conversation.py` | [ ] | |
| `models/connection.py` | [ ] | |

### Tests
| File | Status | Notes |
|------|--------|-------|
| `tests/conftest.py` | [x] | Workspace-root fixture and FastAPI test client fixture added |
| `tests/test_graph.py` | [x] | LangGraph routing and direct-response tests passing |
| `tests/test_tools.py` | [x] | File/code tool behavior and safety tests passing |
| `tests/test_api.py` | [x] | Health and WebSocket tests passing |

---

## Frontend (`frontend/`)

### App Shell
| File | Status | Notes |
|------|--------|-------|
| `app/layout.tsx` | [ ] | |
| `app/page.tsx` | [ ] | |
| `app/chat/page.tsx` | [ ] | |
| `app/connections/page.tsx` | [ ] | |

### Components
| Component | Status | Notes |
|-----------|--------|-------|
| `ChatWindow` | [ ] | |
| `MessageBubble` | [ ] | |
| `InputBar` | [ ] | |
| `ServiceCard` | [ ] | |
| `ConnectButton` | [ ] | |
| `StatusBadge` | [ ] | |

### Plumbing
| File | Status | Notes |
|------|--------|-------|
| `lib/api.ts` | [ ] | |
| `lib/auth.ts` | [ ] | |
| `hooks/use-chat-stream.ts` | [ ] | |
| `app/api/chat/route.ts` | [ ] | |

---

## Infrastructure
| Item | Status | Notes |
|------|--------|-------|
| GitHub Actions CI | [ ] | |
| Dockerfile (backend) | [ ] | |
| `vercel.json` (frontend) | [ ] | |
| DB migrations (Alembic) | [ ] | |

---

## Decisions Made
| Decision | Choice | Reason |
|----------|--------|--------|
| Phase 1A routing | Heuristic router before Groq integration | Keeps the LangGraph shape testable while avoiding LLM/API work too early |
| Tool strategy | Start with local tools first | Proves the end-to-end backend loop without OAuth complexity |
| Memory | Use in-memory checkpointer first | Enough for local development and graph continuity tests |

---

## Known Issues / Blockers
- `uv run pytest` passes, but `langchain_core` emits a Python 3.14 warning about Pydantic v1 compatibility. Local project preference still targets Python 3.12.
- No `.git` directory is present in this workspace root, so normal branch/commit workflow is unavailable here.

---

## Last Session
- **Date:** 2026-04-04
- **Branch:** No git repo detected
- **What was built:** Backend Phase 1A scaffold with FastAPI app, LangGraph workflow, local tools, memory helper, and passing tests
- **Left off at:** Ready for Phase 1B frontend shell or additional Phase 1A hardening

---

## Next Session Should Start With
1. Read this file
2. Confirm whether this folder should be initialized as a Git repo or whether the real repo root is elsewhere
3. Choose between Phase 1B frontend shell or Phase 1A hardening
