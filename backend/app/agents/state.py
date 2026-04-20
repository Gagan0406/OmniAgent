"""LangGraph state definitions."""

from __future__ import annotations

from typing import Annotated, Literal, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class ToolResultRecord(TypedDict):
    """Normalized record for a single executed tool call."""

    tool_name: str
    arguments_json: str
    status: str
    content: str


class PendingConfirmation(TypedDict):
    """Pending outbound action requiring explicit user confirmation."""

    tool_name: str
    tool_call_id: str
    arguments_json: str
    draft_field: str
    draft_text: str
    selected_capability_ids: list[str]


class AgentState(TypedDict, total=False):
    """State shared across the Omni Copilot graph."""

    messages: Annotated[list[BaseMessage], add_messages]
    user_id: str
    route: Literal["direct", "tools"]
    task_summary: str
    selected_capability_ids: list[str]
    executed_tool_signatures: list[str]
    tool_round_count: int
    max_tool_rounds: int
    loop_detected: bool
    tool_results: list[ToolResultRecord]
    pending_confirmation: PendingConfirmation | None
