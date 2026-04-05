"""LangGraph node implementations."""

from __future__ import annotations

import structlog
from groq import BadRequestError
from langchain_core.messages import BaseMessage, SystemMessage, ToolMessage
from langchain_groq import ChatGroq

from app.agents.prompts import SYSTEM_PROMPT
from app.agents.state import AgentState
from app.config import settings
from app.tools import get_all_tools

logger = structlog.get_logger(__name__)


def _prepend_system(messages: list[BaseMessage]) -> list[BaseMessage]:
    """Return messages with the system prompt prepended."""
    return [SystemMessage(content=SYSTEM_PROMPT), *messages]


def _make_llm() -> ChatGroq:
    return ChatGroq(model=settings.groq_model, api_key=settings.groq_api_key, temperature=0)


async def router(state: AgentState) -> dict[str, object]:
    """Call the LLM with bound tools and decide what to do next.

    If Groq rejects the tool call (malformed JSON or schema mismatch),
    falls back to a plain LLM call so the user always gets a response.
    """
    user_id = state.get("user_id", "anonymous")

    tools = await get_all_tools(user_id)

    llm = _make_llm().bind_tools(tools) if tools else _make_llm()

    messages = _prepend_system(state["messages"])

    try:
        response = await llm.ainvoke(messages)
    except BadRequestError as exc:
        if "tool_use_failed" in str(exc):
            logger.warning("tool_use_failed_fallback", user_id=user_id, error=str(exc))
            response = await _make_llm().ainvoke(messages)
        else:
            raise

    logger.info(
        "router_response",
        user_id=user_id,
        has_tool_calls=bool(getattr(response, "tool_calls", None)),
    )
    return {"messages": [response]}


async def tool_executor(state: AgentState) -> dict[str, object]:
    """Execute all tool calls present in the last AIMessage.

    Reads tool_calls off the last message (set by the router), invokes each
    tool, and returns ToolMessages so the router can continue reasoning.
    """
    user_id = state.get("user_id", "anonymous")
    last = state["messages"][-1]
    tool_calls = getattr(last, "tool_calls", []) or []

    if not tool_calls:
        return {}

    tools = await get_all_tools(user_id)
    registry = {t.name: t for t in tools}
    tool_messages: list[ToolMessage] = []

    for call in tool_calls:
        tool_name: str = call["name"]
        tool_args: dict = call.get("args", {})
        call_id: str = call.get("id", tool_name)

        tool = registry.get(tool_name)
        if tool is None:
            content = f"Tool '{tool_name}' is not available."
            logger.warning("tool_not_found", tool=tool_name, user_id=user_id)
        else:
            try:
                content = str(await tool.ainvoke(tool_args))
                logger.info("tool_executed", tool=tool_name, user_id=user_id)
            except Exception as exc:  # noqa: BLE001
                content = f"Tool '{tool_name}' failed: {exc}"
                logger.exception("tool_execution_failed", tool=tool_name, user_id=user_id)

        tool_messages.append(
            ToolMessage(content=content[:10_000], tool_call_id=call_id)
        )

    return {"messages": tool_messages}


def should_use_tool(state: AgentState) -> str:
    """Return 'tool' if the last message has pending tool calls, else 'respond'."""
    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):
        return "tool"
    return "respond"
