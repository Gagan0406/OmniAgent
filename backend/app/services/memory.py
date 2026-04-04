"""LangGraph checkpoint helpers."""

from langgraph.checkpoint.memory import MemorySaver


def get_checkpointer() -> MemorySaver:
    """Return the Phase 1A in-memory LangGraph checkpointer."""

    return MemorySaver()
