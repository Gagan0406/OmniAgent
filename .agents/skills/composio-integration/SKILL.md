---
name: composio-integration
description: "When adding, modifying, or debugging Composio integrations. Covers tool registration, per-user auth, error handling, and the connection management flow."
---

# Composio Integration Patterns — Omni Copilot

## Initializing Composio
```python
from composio_langgraph import ComposioToolSet, Action

toolset = ComposioToolSet(api_key=settings.COMPOSIO_API_KEY)
```

## Registering Tools for a User
```python
async def get_user_tools(user_id: str) -> list:
    """Get Composio tools scoped to a specific user's connections."""
    entity_id = await get_composio_entity_id(user_id)
    tools = toolset.get_tools(
        actions=[
            Action.GMAIL_LIST_MESSAGES,
            Action.GMAIL_SEND_EMAIL,
            Action.GOOGLE_CALENDAR_LIST_EVENTS,
            Action.NOTION_SEARCH,
            Action.SLACK_SEND_MESSAGE,
        ],
        entity_id=entity_id,
    )
    return tools
```

## OAuth Connection Flow
1. Frontend: user clicks "Connect Google" → calls `POST /api/connections/google/initiate`
2. Backend: creates a Composio connection request → returns OAuth redirect URL
3. User: completes OAuth in browser → Composio stores tokens
4. Backend: receives callback → updates user's connection status in DB
5. Frontend: polls connection status → shows "Connected" badge

## Error Handling
```python
from composio.exceptions import ComposioSDKError

try:
    result = await toolset.execute_action(action, params, entity_id=entity_id)
except ComposioSDKError as e:
    if "token expired" in str(e).lower():
        return ToolResult(error="Your Google connection has expired. Please reconnect.")
    raise
```

## Gotchas
- Entity IDs: never trust entity IDs from the frontend. Always look up via `services/auth.py`
- Token refresh: Composio handles this automatically for most providers, but Google occasionally requires re-consent
- Rate limits: Composio has its own rate limits on top of the provider's limits
- Action names: use `Action.GMAIL_LIST_MESSAGES` not string literals — they're type-safe enums
- Connection check: before calling a tool, verify the user has an active connection for that service
