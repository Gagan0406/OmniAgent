# Omni Copilot - Build Status

> Update this file at the end of every session. It is the first handoff file for the next session.

## How to Use
At the start of each session, read this file first.
At the end of each session, update it with what changed, what passed, and what is next.

---

## Current Phase: 6 - Production Hardening

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
| `pyproject.toml` | [x] | pydantic>=2.12, langchain-core 1.x, langchain-groq 1.x, langgraph 1.x, composio-langgraph<1.0.0 |
| `app/main.py` | [x] | FastAPI + CORS + all routers + create_tables() on startup |
| `app/config.py` | [x] | groq_api_key, composio_api_key, groq_model settings |
| `app/db/database.py` | [x] | Async SQLAlchemy engine + create_tables() |
| `app/db/models.py` | [x] | User ORM model (user_id, entity_id, email, name, created_at) |

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
| Gmail (Composio) | [x] | FETCH, SEND, DRAFT, ATTACHMENT wired |
| Google Calendar (Composio) | [x] | LIST_EVENTS, CREATE_EVENT, DELETE_EVENT wired |
| Notion (Composio) | [x] | SEARCH, GET, CREATE page wired |
| Slack (Composio) | [x] | SEND_MESSAGE, LIST_CHANNELS wired |
| Discord (Composio) | [x] | Loaded via toolkit, capped at 3 tools to stay within token limits |
| Zoom (Composio) | [x] | Loaded via toolkit, capped at 3 tools to stay within token limits |
| Local file tools | [x] | Read, list, search workspace tools |
| Code analysis tools | [x] | Analyze and grep code tools |
| Image tools | [~] | Placeholder only |

### Services
| File | Status | Notes |
|------|--------|-------|
| `services/composio_service.py` | [x] | Updated to new Composio SDK (Composio + LanggraphProvider) |
| `services/auth.py` | [x] | Persists user→entity_id in SQLite; graceful fallback in tests |
| `services/memory.py` | [x] | In-memory LangGraph checkpointer (MemorySaver) |

### API
| Endpoint | Status | Notes |
|----------|--------|-------|
| `api/chat.py` (WebSocket) | [x] | Stable thread_id per session for conversation continuity |
| `api/auth.py` | [x] | POST /auth/register — creates entity_id + updates profile |
| `api/connections.py` | [x] | Auto-creates Composio-managed auth config if missing; new SDK API |

### Models
| File | Status | Notes |
|------|--------|-------|
| `models/user.py` | [x] | UserRegisterRequest + UserRegisterResponse Pydantic models |
| `models/conversation.py` | [ ] | Not needed — LangGraph checkpointer handles history |
| `models/connection.py` | [x] | Connection status Pydantic model |

### Tests
| File | Status | Notes |
|------|--------|-------|
| `tests/conftest.py` | [x] | mock_groq fixture patches ChatGroq |
| `tests/test_graph.py` | [x] | All passing |
| `tests/test_tools.py` | [x] | All passing |
| `tests/test_api.py` | [x] | All passing — 10/10 total |

---

## Frontend (`frontend/`)

### App Shell
| File | Status | Notes |
|------|--------|-------|
| `app/layout.tsx` | [x] | Root layout + AuthProvider (SessionProvider wrapper) |
| `app/page.tsx` | [x] | Redirects to /chat |
| `app/chat/page.tsx` | [x] | useSession({ required: true }) — real userId, sign-out button |
| `app/connections/page.tsx` | [x] | useSession({ required: true }) — real userId |
| `app/login/page.tsx` | [x] | Google OAuth + dev credentials form |
| `app/api/auth/[...nextauth]/route.ts` | [x] | NextAuth handler |

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
| `AuthProvider` | [x] | SessionProvider wrapper for layout |

### Plumbing
| File | Status | Notes |
|------|--------|-------|
| `lib/api.ts` | [x] | registerUser now fails silently if backend unreachable |
| `lib/auth.ts` | [x] | NextAuth config: Google provider + dev credentials |
| `hooks/use-chat-stream.ts` | [x] | WebSocket hook with auto-reconnect |
| `middleware.ts` | [x] | Protects /chat and /connections, redirects to /login |
| `types/next-auth.d.ts` | [x] | Extends Session type to include user.id |

---

## Infrastructure
| Item | Status | Notes |
|------|--------|-------|
| GitHub repo | [x] | Gagan0406/OmniAgent |
| GitHub Actions CI | [ ] | Phase 6 |
| Dockerfile (backend) | [ ] | Phase 6 |
| `vercel.json` (frontend) | [ ] | Phase 6 |
| DB migrations (Alembic) | [ ] | Skipped — using create_all() for solo dev SQLite setup |

---

## Phase Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| 1A | Backend scaffold, local tools, LangGraph heuristic router | ✅ Done |
| 1B | Real ChatGroq LLM router, Composio wired, connections API | ✅ Done |
| 2 | Next.js frontend — animated chat UI, sidebar, connections page | ✅ Done |
| 3 | Auth — NextAuth.js login, real session user IDs, backend auth API | ✅ Done |
| 4 | Database — SQLite persistence for user→entity map, conversation continuity fix | ✅ Done |
| 5 | Remaining Composio tools — Discord, Zoom + Composio SDK migration to v1 | ✅ Done |
| 6 | Production hardening — CI, Docker, error boundaries, rate limits | 🔄 In Progress |

---

## Decisions Made
| Decision | Choice | Reason |
|----------|--------|--------|
| Phase 1A routing | Heuristic router first | Keeps LangGraph testable without LLM complexity |
| Tool strategy | Local tools first | Proves e2e loop without OAuth complexity |
| Memory | In-memory checkpointer | Sufficient for local dev; upgrade in Phase 6 if needed |
| LLM | ChatGroq llama-3.3-70b-versatile | Higher token limits than 8b-instant |
| Auth | NextAuth.js v4 + Google + dev credentials | Stable, works with Next.js 14 App Router |
| DB migrations | create_all() instead of Alembic | Solo dev + SQLite — Alembic is overkill |
| Conversation threads | Stable thread_id per WS session | Enables LangGraph memory across turns |
| Pydantic | >=2.12 | Python 3.14 compatible |
| Composio SDK | composio-langgraph 0.11.4 (new Composio+LanggraphProvider API) | Old ComposioToolSet removed in v0.11+ |
| Discord/Zoom tools | toolkit-based loading, limit=3 each | Prevents 413 token overflow on Groq free tier |
| Composio connections | Auto-create managed auth config if missing | Removes need for manual dashboard setup |

---

## Known Issues / Blockers
- Discord/Zoom tool slugs loaded by toolkit (top 3 by relevance) — pin specific slugs after live verification
- MemorySaver resets on server restart — acceptable for dev, upgrade to SQLite checkpointer in Phase 6 if needed
- Google OAuth requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in frontend .env.local
- NEXTAUTH_SECRET must be set in frontend .env.local
- Groq free tier: 6K TPM limit — set GROQ_MODEL=llama-3.3-70b-versatile and keep tool count low

---

## Last Session
- **Date:** 2026-04-05
- **What was built:**
  - Phase 5: Migrated Composio SDK from old ComposioToolSet API to new Composio+LanggraphProvider API
  - Added Discord + Zoom via toolkit-based loading (capped at 3 tools each)
  - Fixed connections API: auto-creates Composio-managed auth config when none exists
  - Fixed 413 token overflow: separated named vs toolkit tool loading with per-toolkit limit
  - Upgraded pydantic to >=2.12, langchain-core/groq/langgraph to 1.x for Python 3.14 compatibility
  - Fixed registerUser failing loudly when backend unreachable
  - Pushed to GitHub: Gagan0406/OmniAgent
- **Tests:** 10/10 backend passing
- **Commits:** feat: complete Phase 5 — Composio SDK migration, Discord/Zoom tools, Python 3.14 deps

---

## Next Session Should Start With
1. Read this file
2. Run `cd backend && uv run pytest` — confirm 10/10 green
3. Phase 6: GitHub Actions CI (lint + test + build), Dockerfile for backend, vercel.json for frontend
4. Phase 6: Add error boundaries in frontend, exponential backoff for Groq rate limits in nodes.py
5. Consider upgrading Groq to dev tier or switching to a model with higher TPM
