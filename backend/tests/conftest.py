"""Shared test fixtures for the backend."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from app.agents.schemas import RouteDecision, TextResponse
from app.main import app

BACKEND_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def client() -> TestClient:
    """Return a FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def workspace_root() -> Path:
    """Return the repository root for workspace-tool tests."""
    return BACKEND_ROOT.parent


@pytest.fixture
def mock_groq(monkeypatch):
    """Replace ChatGroq with a deterministic mock so tests never call Groq API.

    Behaviour:
    - If the last HumanMessage contains a file-read keyword → return AIMessage
      with a tool_call for read_workspace_file pointing at CLAUDE.md.
    - After a ToolMessage appears in the conversation (second router pass) →
      return a plain AIMessage summarising the tool output.
    - All other messages → return a plain AIMessage.
    """

    async def fake_route_decision(messages: list, **kwargs) -> RouteDecision:
        human = next(
            (message for message in reversed(messages) if isinstance(message, HumanMessage)),
            None,
        )
        text = str(human.content).lower() if human else ""

        if any(kw in text for kw in ("read file", "open file", "claude.md", "show file")):
            return RouteDecision(
                route="tools",
                task_summary="Read the requested workspace file.",
                selected_capability_ids=["tool:read_workspace_file"],
                max_tool_rounds=2,
            )

        return RouteDecision(
            route="direct",
            task_summary="Respond directly to the user.",
            selected_capability_ids=[],
            max_tool_rounds=1,
        )

    async def fake_text_response(messages: list, **kwargs) -> TextResponse:
        if any(isinstance(m, ToolMessage) for m in messages):
            tool_msg = next(m for m in reversed(messages) if isinstance(m, ToolMessage))
            return TextResponse(response=f"Omni Copilot processed: {tool_msg.content[:500]}")

        return TextResponse(response="I'm Omni Copilot. How can I help you today?")

    async def fake_ainvoke(messages: list, **kwargs) -> AIMessage:
        # Second pass: a ToolMessage is the last non-system message → synthesise reply
        if any(isinstance(m, ToolMessage) for m in messages):
            tool_msg = next(m for m in reversed(messages) if isinstance(m, ToolMessage))
            return AIMessage(content=f"Omni Copilot processed: {tool_msg.content[:500]}")

        # First pass: decide whether to call a tool
        human = next(
            (m for m in reversed(messages) if isinstance(m, HumanMessage)),
            None,
        )
        text = str(human.content).lower() if human else ""

        if any(kw in text for kw in ("read file", "open file", "claude.md", "show file")):
            return AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "read_workspace_file",
                        "args": {"file_path": "CLAUDE.md"},
                        "id": "call_test_001",
                    }
                ],
            )

        return AIMessage(content="I'm Omni Copilot. How can I help you today?")

    mock_instance = MagicMock()
    mock_instance.bind_tools = MagicMock(return_value=mock_instance)
    mock_instance.ainvoke = AsyncMock(side_effect=fake_ainvoke)
    def fake_with_structured_output(schema, **kwargs):
        structured_runner = MagicMock()
        if schema is RouteDecision:
            structured_runner.ainvoke = AsyncMock(side_effect=fake_route_decision)
        else:
            structured_runner.ainvoke = AsyncMock(side_effect=fake_text_response)
        return structured_runner

    mock_instance.with_structured_output = MagicMock(side_effect=fake_with_structured_output)

    mock_class = MagicMock(return_value=mock_instance)
    monkeypatch.setattr("app.agents.nodes.ChatGroq", mock_class)
    return mock_class
