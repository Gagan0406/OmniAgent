---
name: langgraph-patterns
description: "When creating or modifying the LangGraph agent, adding nodes, defining state, or changing routing logic. Covers StateGraph patterns, node functions, conditional edges, and tool integration."
---

# LangGraph Patterns — Omni Copilot

## State Definition (`agents/state.py`)
```python
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    user_id: str
    tool_calls: list[ToolCall]
    tool_results: list[ToolResult]
    active_tools: list[str]  # tools available for this user based on connections
```

State is immutable per step. Nodes return partial state updates — LangGraph merges them.

## Node Functions (`agents/nodes.py`)
Every node is an async function: `async def node_name(state: AgentState) -> dict`

```python
async def router(state: AgentState) -> dict:
    """Decides what to do next based on the last message."""
    llm = ChatGroq(model="...", temperature=0)
    response = await llm.ainvoke(state["messages"])
    return {"messages": [response]}
```

## Graph Construction (`agents/graph.py`)
```python
graph = StateGraph(AgentState)
graph.add_node("router", router)
graph.add_node("tool_executor", tool_executor)
graph.add_node("responder", responder)

graph.set_entry_point("router")
graph.add_conditional_edges("router", should_use_tool, {
    "tool": "tool_executor",
    "respond": "responder",
})
graph.add_edge("tool_executor", "router")  # loop back after tool execution
graph.add_edge("responder", END)

compiled = graph.compile(checkpointer=memory)
```

## Adding a New Node
1. Define the function in `nodes.py`
2. Add it to the graph in `graph.py` with `graph.add_node()`
3. Define edges (where it connects to)
4. Test the full graph flow

## Gotchas
- Graph is immutable after `.compile()` — all changes must happen before
- Use `add_messages` annotation for the messages list (handles message appending)
- Tool calls come back as `AIMessage` with `tool_calls` attribute
- Always handle the case where the LLM doesn't return tool calls (just responds)
- State keys must be strings — no complex nested objects as keys
