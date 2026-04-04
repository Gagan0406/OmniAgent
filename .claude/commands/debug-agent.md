Debug an issue with the LangGraph agent: $ARGUMENTS

## Process
1. Check the current graph definition in `backend/app/agents/graph.py`
2. Check the state schema in `backend/app/agents/state.py`
3. Trace the issue:
   - What message triggers it?
   - Which node does it fail at? (router? tool_executor? responder?)
   - What's in the state at the point of failure?
4. Check tool registry — is the tool properly registered?
5. Check Composio connection — is the user's token valid?
6. Check Groq response — is the LLM returning valid tool calls?

## Common Issues
- **"Tool not found"**: tool not exported from `tools/__init__.py` or not in compiled graph's tool list
- **"Invalid tool call format"**: Groq model returning malformed function calls — check `langchain-groq` version
- **"State key error"**: node accessing state key that wasn't defined in `AgentState`
- **"Composio 401"**: user's OAuth token expired — trigger re-auth flow
- **"Graph recursion limit"**: agent stuck in a loop — check edge conditions in `graph.py`

## Output
- Root cause analysis
- Minimal fix
- A test that would have caught this
