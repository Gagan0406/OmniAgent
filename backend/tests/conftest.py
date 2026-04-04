"""Shared test fixtures for the backend."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

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

    async def fake_ainvoke(messages: list, **kwargs) -> AIMessage:
        # Second pass: a ToolMessage is the last non-system message → synthesise reply
        non_system = [m for m in messages if not isinstance(m, AIMessage.__class__.__mro__[0])]
        if any(isinstance(m, ToolMessage) for m in messages):
            tool_msg = next(m for m in reversed(messages) if isinstance(m, ToolMessage))
            return AIMessage(content=tool_msg.content[:500])

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

    mock_class = MagicMock(return_value=mock_instance)
    monkeypatch.setattr("app.agents.nodes.ChatGroq", mock_class)
    return mock_class
