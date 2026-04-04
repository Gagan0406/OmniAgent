"""LangGraph state definitions."""

from __future__ import annotations

from typing import Annotated, TypedDict

from langgraph.graph.message import add_messages


class AgentState(TypedDict, total=False):
    """State shared across the Omni Copilot graph.

    Keys:
        messages: Append-only conversation history managed by LangGraph.
        user_id: Internal user identifier used for per-user tool scoping.
    """

    messages: Annotated[list, add_messages]
    user_id: str
