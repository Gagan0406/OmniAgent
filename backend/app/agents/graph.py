"""Compiled LangGraph graph — ReAct loop with Groq LLM."""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.agents.nodes import router, should_use_tool, tool_executor
from app.agents.state import AgentState
from app.services.memory import get_checkpointer


def _build_graph() -> object:
    """Build and compile the agent graph.

    Flow:
        START → router
        router --tool_calls--> tool_executor → router  (ReAct loop)
        router --no tool_calls--> END                  (final response)
    """
    graph = StateGraph(AgentState)

    graph.add_node("router", router)
    graph.add_node("tool_executor", tool_executor)

    graph.add_edge(START, "router")
    graph.add_conditional_edges(
        "router",
        should_use_tool,
        {
            "tool": "tool_executor",
            "respond": END,
        },
    )
    graph.add_edge("tool_executor", "router")

    return graph.compile(checkpointer=get_checkpointer())


compiled_graph = _build_graph()
