# OmniAgent

A multi-tenant AI copilot that gives users unified chat access to **Gmail, Google Calendar, Notion, Slack, Discord, Zoom**, local files, images, and code — powered by **LangGraph** agents running on **Groq LLMs**, with **Composio** handling third-party OAuth.

---

## Features

- **Unified Chat Interface** — one conversation window to interact with all your connected services
- **LangGraph ReAct Agent** — router → tool executor → router loop with full conversation memory per session
- **Groq LLMs** — fast inference with `llama-3.3-70b-versatile`
- **Composio OAuth** — per-user connected accounts for Gmail, Calendar, Notion, Slack, Discord, Zoom
- **Local Tools** — read/search files and analyze code directly from the workspace
- **Auth** — Google OAuth + dev credentials via NextAuth.js
- **Persistent User Mapping** — SQLite stores user → Composio entity ID across server restarts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Framer Motion, NextAuth.js |
| Backend | Python 3.12+, FastAPI, LangGraph, LangChain-Groq |
| LLM | Groq (`llama-3.3-70b-versatile`) |
| Integrations | Composio (Gmail, Calendar, Notion, Slack, Discord, Zoom) |
| Database | SQLite via SQLAlchemy async |
| Package Manager | `uv` (backend), `pnpm` (frontend) |

---

## Project Structure

```
omniagent/
├── backend/                  # Python FastAPI + LangGraph agent
│   ├── app/
│   │   ├── agents/           # LangGraph state, nodes, graph, prompts
│   │   ├── api/              # chat (WebSocket), auth, connections routes
│   │   ├── db/               # SQLAlchemy models + async engine
│   │   ├── services/         # Composio client, auth/entity mapping, memory
│   │   └── tools/            # Composio tools + local file/code tools
│   ├── tests/
│   └── pyproject.toml
└── frontend/                 # Next.js chat UI
    └── src/
        ├── app/              # chat, connections, login pages
        ├── components/       # ChatWindow, MessageBubble, ServiceCard, etc.
        ├── hooks/            # WebSocket streaming hook
        └── lib/              # API client, NextAuth config
```

---

## Getting Started

### Prerequisites

- Python 3.12+ with [`uv`](https://docs.astral.sh/uv/)
- Node.js 20 LTS with [`pnpm`](https://pnpm.io/)
- [Groq API key](https://console.groq.com/) (free tier works)
- [Composio API key](https://platform.composio.dev/) (for SaaS integrations)
- Google OAuth credentials (for login)

---

### 1. Clone the repo

```bash
git clone https://github.com/Gagan0406/OmniAgent.git
cd OmniAgent
```

---

### 2. Backend setup

```bash
cd backend
uv sync
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
COMPOSIO_API_KEY=your_composio_api_key
DATABASE_URL=sqlite+aiosqlite:///./omni_copilot.db
```

Start the backend:

```bash
uv run uvicorn app.main:app --reload --port 8000
```

---

### 3. Frontend setup

```bash
cd frontend
pnpm install
```

Create `frontend/.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=any-random-string
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

> **Getting Google credentials:** Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web). Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI.

Start the frontend:

```bash
pnpm dev
```

Open **http://localhost:3000**

---

### 4. Connect your services

1. Sign in with Google (or use dev credentials)
2. Go to **Connections** (`/connections`)
3. Click **Connect** next to any service (Gmail, Notion, Slack, etc.)
4. Complete the OAuth flow — the agent can now access that service on your behalf

---

## Running Tests

```bash
cd backend
uv run pytest
```

10 tests covering the agent graph, tools, and API endpoints. All external services (Groq, Composio) are mocked.

---

## Supported Integrations

| Service | Actions |
|---|---|
| **Gmail** | Fetch emails, send email, create draft, get attachment |
| **Google Calendar** | List events, create event, delete event |
| **Notion** | Search pages, get page, create page |
| **Slack** | Send message, list channels |
| **Discord** | Top 3 actions (send message, read messages, list channels) |
| **Zoom** | Top 3 actions (create meeting, list meetings, get meeting) |
| **Local Files** | Read files, list directory, search content |
| **Code** | Analyze code files, grep across codebase |

---

## Example Prompts

```
Have I received any emails from my manager today?
Schedule a 1-hour meeting tomorrow at 2pm called "Design Review"
Search my Notion for notes about the Q2 roadmap
Send a message to #general on Slack saying "Standup in 5 mins"
Create a Zoom meeting for the team this Friday at 10am
Read the file backend/app/agents/nodes.py and explain what it does
```

---

## Architecture

```
User → NextAuth (login) → Next.js frontend
                              ↓ WebSocket
                         FastAPI backend
                              ↓
                    LangGraph ReAct Agent
                    ┌─────────────────────┐
                    │  router (ChatGroq)   │
                    │       ↓             │
                    │  tool_executor      │
                    │       ↓             │
                    │  router (loop)      │
                    └─────────────────────┘
                              ↓
              ┌───────────────┼──────────────┐
         Composio tools   Local tools    Code tools
       (Gmail, Notion,   (file read,    (analyze,
        Slack, Discord,   search)        grep)
        Zoom, Calendar)
```

---

## Phase Roadmap

| Phase | Description | Status |
|---|---|---|
| 1A | Backend scaffold, local tools, LangGraph router | ✅ Done |
| 1B | Real Groq LLM router, Composio wired | ✅ Done |
| 2 | Next.js animated chat UI | ✅ Done |
| 3 | Auth — NextAuth.js, Google login | ✅ Done |
| 4 | SQLite persistence, conversation continuity | ✅ Done |
| 5 | Discord + Zoom tools, Composio SDK v1 migration | ✅ Done |
| 6 | CI/CD, Docker, error boundaries, rate limits | 🔄 In Progress |

---

## License

MIT
