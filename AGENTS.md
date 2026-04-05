# Omni Copilot

A multi-tenant AI copilot that gives users unified chat access to Google Workspace, Notion, Slack, Discord, Zoom, local files, images, code files, and Google Forms — powered by LangGraph agents on Groq LLMs with Composio handling third-party auth.

## Quick Reference

### Backend (Python — `backend/`)
- **Install:** `cd backend && uv sync`
- **Dev server:** `cd backend && uv run uvicorn app.main:app --reload --port 8000`
- **Test:** `cd backend && uv run pytest`
- **Lint:** `cd backend && uv run ruff check .`
- **Format:** `cd backend && uv run ruff format .`
- **Type-check:** `cd backend && uv run pyright`

### Frontend (TypeScript — `frontend/`)
- **Install:** `cd frontend && pnpm install`
- **Dev server:** `cd frontend && pnpm dev`
- **Test:** `cd frontend && pnpm test`
- **Lint:** `cd frontend && pnpm lint`
- **Build:** `cd frontend && pnpm build`

## Architecture Overview

This is a monorepo with two top-level directories: `backend/` (Python FastAPI) and `frontend/` (Next.js).

The backend is the brain. A LangGraph agent receives user messages via a FastAPI WebSocket endpoint, routes them through a state machine that decides which tools to invoke, executes tool calls (via Composio for SaaS integrations, custom tools for local operations), and streams responses back.

Composio handles all OAuth per user. Each user is a Composio "entity" with their own connected accounts (Google, Notion, Slack, etc.). The backend stores the mapping between our user IDs and Composio entity IDs.

The frontend is a Next.js chat interface using Vercel AI SDK for streaming. It handles user auth (NextAuth.js), the OAuth connection flow (redirect to Composio's auth URL), and renders streamed agent responses.

## Directory Map

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, lifespan
│   ├── config.py             # Settings via pydantic-settings (env vars)
│   ├── agents/
│   │   ├── graph.py          # Main LangGraph StateGraph definition
│   │   ├── state.py          # AgentState TypedDict
│   │   ├── nodes.py          # Node functions (router, tool_executor, responder)
│   │   └── prompts.py        # System prompts for the agent
│   ├── tools/
│   │   ├── __init__.py       # Tool registry — all tools exported here
│   │   ├── composio_tools.py # Composio toolkit wrappers (Google, Notion, Slack...)
│   │   ├── file_tools.py     # Local file read/write/search
│   │   ├── code_tools.py     # Code file analysis, grep, tree
│   │   └── image_tools.py    # Image handling tools
│   ├── services/
│   │   ├── auth.py           # User auth + Composio entity mapping
│   │   ├── composio_service.py # Composio client init + connection management
│   │   └── memory.py         # Conversation memory (checkpointer)
│   ├── models/
│   │   ├── user.py           # User model
│   │   ├── conversation.py   # Conversation/message models
│   │   └── connection.py     # OAuth connection status models
│   ├── api/
│   │   ├── chat.py           # WebSocket chat endpoint
│   │   ├── auth.py           # Auth routes (login, signup, OAuth callback)
│   │   └── connections.py    # Manage connected services
│   └── db/
│       ├── database.py       # SQLAlchemy async engine + session
│       └── migrations/       # Alembic migrations
├── tests/
│   ├── conftest.py           # Fixtures: test client, mock Composio, mock Groq
│   ├── test_graph.py         # LangGraph agent flow tests
│   ├── test_tools.py         # Individual tool tests
│   └── test_api.py           # API endpoint tests
├── pyproject.toml
└── .env.example

frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout with providers
│   │   ├── page.tsx          # Landing / redirect to chat
│   │   ├── chat/page.tsx     # Main chat interface
│   │   ├── connections/page.tsx # Manage connected services
│   │   └── api/chat/route.ts # API route proxying to backend WebSocket
│   ├── components/
│   │   ├── chat/             # ChatWindow, MessageBubble, InputBar
│   │   ├── connections/      # ServiceCard, ConnectButton, StatusBadge
│   │   └── ui/               # Shared UI primitives
│   ├── lib/
│   │   ├── api.ts            # Backend API client
│   │   └── auth.ts           # NextAuth config
│   └── hooks/
│       └── use-chat-stream.ts # WebSocket streaming hook
├── package.json
├── tailwind.config.ts
└── .env.example
```

## Code Conventions

### Python (backend)
- Use `async/await` everywhere — FastAPI and LangGraph are async-native
- Type hints on every function signature, use `TypedDict` for LangGraph state
- Prefer `pydantic.BaseModel` for API request/response schemas
- Imports: stdlib → third-party → local, sorted by ruff
- Use `structlog` for structured logging, never bare `print()`
- Environment variables via `pydantic-settings`, never hardcoded
- Prefix private functions/methods with `_`

### TypeScript (frontend)
- Strict mode always (`"strict": true` in tsconfig)
- Functional components only, hooks for state
- Use `unknown` over `any` — if you need `any`, add a comment explaining why
- Prefer named exports over default exports
- Use Tailwind for all styling — no CSS modules, no styled-components

### Shared
- Prefer composition over inheritance
- Prefer small, focused functions (< 30 lines)
- Prefer explicit over implicit — no magic, no clever tricks
- Every public function gets a docstring/JSDoc

## Testing Philosophy

- Backend: pytest with `pytest-asyncio` for async tests. Mock external services (Composio, Groq) with fixtures in `conftest.py`. Test the LangGraph graph by invoking it with mock state and asserting on output state. Test tools individually with mocked API responses.
- Frontend: vitest + React Testing Library. Test component behavior, not implementation. Mock API calls with MSW (Mock Service Worker).
- Integration: test the full chat flow (message in → agent processes → response out) with mocked external services but real LangGraph execution.
- Aim for meaningful coverage on the agent graph, tool functions, and API endpoints. UI components get tested for critical interactions, not pixel-perfect rendering.

## Git Workflow

- Branch naming: `feat/add-notion-tool`, `fix/oauth-refresh-bug`, `chore/update-deps`
- Commit format: conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`)
- PR: must pass CI (lint + type-check + test + build) before merge
- Never commit directly to `main` — always feature branches
- Squash merge to keep history clean

## Gotchas

- Composio entity IDs are NOT the same as user IDs — always map through `services/auth.py`
- Groq rate limits are aggressive on free tier — add exponential backoff in `agents/nodes.py`
- LangGraph's `StateGraph` is immutable after compilation — define all nodes/edges before calling `.compile()`
- Composio OAuth tokens expire — the service handles refresh automatically BUT you must catch `TokenExpired` errors and re-trigger the auth flow
- `uv run` must prefix ALL Python commands — don't assume the virtualenv is activated
- Frontend `.env.local` needs `NEXT_PUBLIC_` prefix for client-side env vars
- WebSocket connections through Vercel require special config — use `vercel.json` with `rewrites`
- Groq's function calling format differs slightly from OpenAI's — use `langchain-groq`'s `ChatGroq` which handles translation

## Key Dependencies

### Backend
- `langgraph` — agent state machine and graph orchestration
- `langchain-groq` — Groq LLM integration with LangChain-compatible interface
- `composio-langgraph` — Composio tools as LangGraph-compatible tools
- `fastapi` + `uvicorn` — async API server
- `sqlalchemy[asyncio]` + `asyncpg` — async PostgreSQL ORM
- `pydantic-settings` — typed env var configuration
- `structlog` — structured logging

### Frontend
- `next` — React framework with App Router
- `ai` (Vercel AI SDK) — streaming chat UI primitives
- `next-auth` — authentication
- `tailwindcss` — utility-first styling
