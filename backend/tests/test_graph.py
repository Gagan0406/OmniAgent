"""Graph integration tests."""

from __future__ import annotations

from langchain_core.messages import HumanMessage

from app.agents.graph import compiled_graph


async def test_graph_returns_direct_response_for_general_message(mock_groq) -> None:
    """The graph should return the LLM reply directly when no tool is needed."""
    result = await compiled_graph.ainvoke(
        {
            "messages": [HumanMessage(content="Hello there")],
            "user_id": "test-user",
        },
        config={"configurable": {"thread_id": "graph-direct"}},
    )

    reply = str(result["messages"][-1].content)
    assert reply  # non-empty
    assert "Omni Copilot" in reply


async def test_graph_reads_workspace_file_when_user_requests_contents(mock_groq) -> None:
    """The graph should route file-read requests through the file tool."""
    result = await compiled_graph.ainvoke(
        {
            "messages": [HumanMessage(content="Read file CLAUDE.md")],
            "user_id": "test-user",
        },
        config={"configurable": {"thread_id": "graph-read-file"}},
    )

    reply = str(result["messages"][-1].content)
    assert "Omni Copilot" in reply
