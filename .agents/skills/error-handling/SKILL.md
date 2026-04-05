---
name: error-handling
description: "When adding error handling to any part of Omni Copilot. Covers Python exception patterns, Composio error mapping, LangGraph error recovery, and frontend error states."
---

# Error Handling — Omni Copilot

## Backend Error Hierarchy
```python
class OmniCopilotError(Exception):
    """Base error for all application errors."""
    def __init__(self, message: str, user_message: str | None = None):
        super().__init__(message)
        self.user_message = user_message or "Something went wrong. Please try again."

class ConnectionNotFoundError(OmniCopilotError):
    """User hasn't connected this service."""

class TokenExpiredError(OmniCopilotError):
    """OAuth token has expired and needs re-authorization."""

class ToolExecutionError(OmniCopilotError):
    """A tool failed to execute."""

class RateLimitError(OmniCopilotError):
    """Hit rate limits on Groq or an external service."""
```

## Composio Error Mapping
```python
async def safe_tool_execute(action, params, entity_id):
    try:
        return await toolset.execute_action(action, params, entity_id=entity_id)
    except ComposioSDKError as e:
        error_str = str(e).lower()
        if "not connected" in error_str:
            raise ConnectionNotFoundError(
                str(e),
                user_message=f"You haven't connected this service yet. Would you like to connect it now?"
            )
        if "token" in error_str and ("expired" in error_str or "invalid" in error_str):
            raise TokenExpiredError(
                str(e),
                user_message="Your connection has expired. Please reconnect in Settings."
            )
        raise ToolExecutionError(str(e))
```

## LangGraph Error Recovery
In the tool_executor node, catch errors and convert to messages:
```python
async def tool_executor(state: AgentState) -> dict:
    try:
        result = await execute_tool(state["tool_calls"][-1])
        return {"messages": [ToolMessage(content=result)]}
    except ConnectionNotFoundError as e:
        return {"messages": [AIMessage(content=e.user_message)]}
    except ToolExecutionError as e:
        logger.error("tool_execution_failed", error=str(e))
        return {"messages": [AIMessage(content=e.user_message)]}
```

## Frontend Error States
Every async operation needs three states: loading, success, error.
```typescript
const [state, setState] = useState<"idle" | "loading" | "error">("idle");
const [error, setError] = useState<string | null>(null);
```

## Rules
- Never expose internal errors to users — always map to user_message
- Log all errors with `structlog` including context (user_id, tool_name, action)
- Never swallow exceptions silently — at minimum log them
- Composio errors: always check for token expiry first
- Groq errors: implement exponential backoff for rate limits
