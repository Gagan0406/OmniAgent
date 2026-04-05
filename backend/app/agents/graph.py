"""Compiled LangGraph graph — ReAct loop with Groq LLM."""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.agents.nodes import (
    classify_intent,
    direct_responder,
    route_after_classification,
    should_continue_after_tools,
    should_use_tool,
    synthesize_response,
    tool_executor,
    tool_reasoner,
)
from app.agents.state import AgentState
from app.services.memory import get_checkpointer

def _legacy_build_graph() -> object:
    """Build and compile the agent graph.

    Flow:
        START → router
        router --tool_calls--> tool_executor → router  (ReAct loop)
        router --no tool_calls--> END                  (final response)
    """
    return _build_graph_v2()


def _build_graph_v2() -> object:
    """Build the classify-select-execute-synthesize graph."""

    graph = StateGraph(AgentState)

    graph.add_node("classify_intent", classify_intent)
    graph.add_node("direct_responder", direct_responder)
    graph.add_node("tool_reasoner", tool_reasoner)
    graph.add_node("tool_executor", tool_executor)
    graph.add_node("synthesize_response", synthesize_response)

    graph.add_edge(START, "classify_intent")
    graph.add_conditional_edges(
        "classify_intent",
        route_after_classification,
        {
            "direct": "direct_responder",
            "tools": "tool_reasoner",
        },
    )
    graph.add_edge("direct_responder", END)
    graph.add_conditional_edges(
        "tool_reasoner",
        should_use_tool,
        {
            "tool": "tool_executor",
            "respond": "synthesize_response",
        },
    )
    graph.add_conditional_edges(
        "tool_executor",
        should_continue_after_tools,
        {
            "tool": "tool_reasoner",
            "respond": "synthesize_response",
        },
    )
    graph.add_edge("synthesize_response", END)

    return graph.compile(checkpointer=get_checkpointer())


def _build_graph() -> object:
    """Build the latest graph version."""

    return _build_graph_v2()


compiled_graph = _build_graph()
