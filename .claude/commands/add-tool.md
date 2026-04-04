Add a new tool/integration to Omni Copilot: $ARGUMENTS

## Process
1. Determine the tool tier:
   - **Composio tool** (Google, Notion, Slack, Discord, Zoom, Teams): wire via `composio-langgraph` toolkit
   - **Custom tool** (local files, code, images): build a LangGraph-compatible tool function
   - **Direct API** (anything Composio doesn't cover): use the official SDK

2. For Composio tools:
   - Add the app to `backend/app/tools/composio_tools.py`
   - Register required Composio actions (e.g. `GMAIL_SEND_EMAIL`, `GMAIL_LIST_MESSAGES`)
   - Add error handling for `TokenExpired` and `ConnectionNotFound`
   - Add the OAuth connection flow to `backend/app/api/connections.py`
   - Add a ServiceCard to `frontend/src/components/connections/`
   - Write tests with mocked Composio responses

3. For custom tools:
   - Create the tool function in the appropriate file under `backend/app/tools/`
   - Add to the tool registry in `backend/app/tools/__init__.py`
   - Ensure the LangGraph router can select this tool
   - Write unit tests

4. Update:
   - Tool registry in `backend/app/tools/__init__.py`
   - Router prompt if needed (`backend/app/agents/prompts.py`)
   - Connection status UI if it's a user-connected service
   - CLAUDE.md gotchas section if there are quirks
