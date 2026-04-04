# Agent Rules (backend/app/agents/)

Applies when Claude accesses any file under `backend/app/agents/`.

- LangGraph state schema (`AgentState`) is the source of truth — document every key
- Node functions are pure: they read state, do work, return partial state updates
- Never mutate state directly — return new values and let LangGraph merge
- The router node decides which tool to use based on the LLM's response
- Always handle the case where the LLM responds with text (no tool call)
- Graph must be compiled exactly once at import time — never recompile per request
- Use `add_messages` annotation for the messages list
- Keep system prompts in `prompts.py`, not hardcoded in node functions
- Test the compiled graph with real (mocked) message flows, not just individual nodes
