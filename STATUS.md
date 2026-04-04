# Omni Copilot - Build Status

> Update this file at the end of every session. It is the first handoff file for the next session.

## How to Use
At the start of each session, read this file first.
At the end of each session, update it with what changed, what passed, and what is next.

---

## Current Phase: 3 - Auth + Real User Sessions

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
| `pyproject.toml` | [x] | All deps including composio-langgraph, langchain-groq |
| `app/main.py` | [x] | FastAPI app with CORS, health, chat + connections routers |
| `app/config.py` | [x] | groq_api_key, composio_api_key, groq_model settings |
| `app/db/database.py` | [x] | Placeholder async DB session scaffold |

### Agent Core
| File | Status | Notes |
|------|--------|-------|
| `app/agents/state.py` | [x] | Minimal state: messages (add_messages), user_id |
| `app/agents/nodes.py` | [x] | Real ChatGroq router, tool_executor, should_use_tool edge |
| `app/agents/graph.py` | [x] | ReAct loop: router → tool_executor → router, exits to END |
| `app/agents/prompts.py` | [x] | Full system prompt covering all services |

### Tools
| Tool | Status | Notes |
|------|--------|-------|
| `tools/__init__.py` (registry) | [x] | get_all_tools() merges local + composio tools |
| Gmail (Composio) | [x] | FETCH, SEND, DRAFT wired — needs live COMPOSIO_API_KEY |
| Google Calendar (Composio) | [~] | Wired as stub action, needs real action IDs |
| Notion (Composio) | [~] | Wired as stub action, needs real action IDs |
| Slack (Composio) | [~] | Wired as stub action, needs real action IDs |
| Discord (Composio) | [~] | Wired as stub action, needs real action IDs |
| Zoom (Composio) | [~] | Wired as stub action, needs real action IDs |
| Local file tools | [x] | Read, list, search workspace tools |
| Code analysis tools | [x] | Analyze and grep code tools |
| Image tools | [~] | Placeholder only |

### Services
| File | Status | Notes |
|------|--------|-------|
| `services/composio_service.py` | [x] | Lazy singleton, gracefully returns None without API key |
| `services/auth.py` | [~] | In-memory user→entity_id map; resets on restart (Phase 4 will persist) |
| `services/memory.py` | [x] | In-memory LangGraph checkpointer |

### API
| Endpoint | Status | Notes |
|----------|--------|-------|
| `api/chat.py` (WebSocket) | [x] | WebSocket at /api/chat/ws, streams status + final |
| `api/auth.py` | [ ] | Phase 3 |
| `api/connections.py` | [x] | GET/POST/DELETE /connections — Composio OAuth flow |

### Models
| File | Status | Notes |
|------|--------|-------|
| `models/user.py` | [ ] | Phase 3/4 |
| `models/conversation.py` | [ ] | Phase 4 |
| `models/connection.py` | [x] | Connection status Pydantic model |

### Tests
| File | Status | Notes |
|------|--------|-------|
| `tests/conftest.py` | [x] | mock_groq fixture patches ChatGroq, fakes tool calls |
| `tests/test_graph.py` | [x] | ReAct loop, tool routing, direct-response — all passing |
| `tests/test_tools.py` | [x] | File/code tool tests passing |
| `tests/test_api.py` | [x] | Health, WebSocket, connections endpoints — 10/10 passing |

---

## Frontend (`frontend/`)

### App Shell
| File | Status | Notes |
|------|--------|-------|
| `app/layout.tsx` | [x] | Root layout, Geist font |
| `app/page.tsx` | [x] | Redirects to /chat |
| `app/chat/page.tsx` | [x] | Animated sidebar, particles, header with status pill |
| `app/connections/page.tsx` | [x] | Full service management for all 6 integrations |

### Components
| Component | Status | Notes |
|-----------|--------|-------|
| `ChatWindow` | [x] | Empty state with suggestion pills, auto-scroll |
| `MessageBubble` | [x] | Bot/User icons, glass bubble, framer-motion entrance |
| `InputBar` | [x] | Shimmer scan, rotate-transition send/stop, WifiOff banner |
| `TypingIndicator` | [x] | Ping avatar ring, pill bubble, mirror-bounce dots |
| `ServiceCard` | [x] | Hover lift, ping dot, gradient overlay |
| `ServiceSidebar` | [x] | Live connection status, click to connect/disconnect |
| `StatusBadge` | [x] | Connected/disconnected pill badge |

### Plumbing
| File | Status | Notes |
|------|--------|-------|
| `lib/api.ts` | [x] | fetchConnections, initiateConnection, disconnectService |
| `hooks/use-chat-stream.ts` | [x] | WebSocket hook with auto-reconnect and message queue |

---

## Infrastructure
| Item | Status | Notes |
|------|--------|-------|
| GitHub Actions CI | [ ] | Phase 6 |
| Dockerfile (backend) | [ ] | Phase 6 |
| `vercel.json` (frontend) | [ ] | Phase 6 |
| DB migrations (Alembic) | [ ] | Phase 4 |

---

## Phase Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| 1A | Backend scaffold, local tools, LangGraph heuristic router | ✅ Done |
| 1B | Real ChatGroq LLM router, Composio wired, connections API | ✅ Done |
| 2 | Next.js frontend — animated chat UI, sidebar, connections page | ✅ Done |
| 3 | Auth — NextAuth.js login, real session user IDs, backend auth API | 🔄 In Progress |
| 4 | Database — Alembic migrations, persistent memory (Postgres/Redis) | [ ] |
| 5 | Remaining Composio tools — Calendar, Notion, Slack, Discord, Zoom | [ ] |
| 6 | Production hardening — CI, Docker, error boundaries, rate limits | [ ] |

---

## Decisions Made
| Decision | Choice | Reason |
|----------|--------|--------|
| Phase 1A routing | Heuristic router first | Keeps LangGraph testable without LLM complexity |
| Tool strategy | Local tools first | Proves e2e loop without OAuth complexity |
| Memory | In-memory checkpointer | Sufficient for local dev; Postgres in Phase 4 |
| LLM | ChatGroq llama-3.3-70b-versatile | Fast, free-tier capable, LangChain-compatible |
| Frontend styling | Dark glassmorphism, indigo/violet | Matches copilot aesthetic |
| Commit style | No AI attribution | User preference |
| Git workflow | Direct commits to main | Solo dev project |

---

## Known Issues / Blockers
- `USER_ID = "local-dev-user"` is hardcoded in frontend — Phase 3 fixes this
- `services/auth.py` entity map is in-memory — resets on restart, Phase 4 persists it
- Composio stub actions for Calendar/Notion/Slack/Discord/Zoom need real action IDs — Phase 5
- `uv run pytest` emits Pydantic v1 compatibility warning (Python 3.14 check) — harmless

---

## Last Session
- **Date:** 2026-04-04
- **What was built:** Phase 2 — full Next.js frontend with animated UI
  - WebSocket streaming hook with auto-reconnect
  - Chat page with floating particles, animated sidebar, glass header
  - InputBar: shimmer scan line, rotate-transition send/stop button, WifiOff banner
  - MessageBubble: Bot/User lucide icons, `bg-black/40 backdrop-blur-xl` glass bubble
  - TypingIndicator: ping avatar ring, pill container, mirror-bounce dots
  - ServiceCard: whileHover lift, ping dot on connected emoji, gradient overlay
  - Connections page with all 6 services
- **Tests:** `pnpm build` passes clean
- **Commit:** `feat: add Next.js frontend with animated chat UI (Phase 2)`

---

## Next Session Should Start With
1. Read this file
2. Run `cd backend && uv run pytest` to confirm backend still green
3. Continue Phase 3: NextAuth.js login flow + backend auth API
