Break down the following feature for Omni Copilot into an implementation plan:

$ARGUMENTS

## Process
1. Use the researcher agent to explore what already exists in the codebase for this feature
2. Use the system-architect agent if this involves a new integration or architectural decision
3. Use the task-manager agent to decompose into atomic tasks
4. Present the plan as a numbered checklist with size estimates

## Rules
- Each task should be independently testable
- Identify the riskiest task and suggest tackling it first (spike if needed)
- For new Composio integrations: always include tasks for auth flow + tool registration + error handling + tests
- For new LangGraph nodes: always include tasks for state definition + node function + edge routing + tests
- If anything is unclear, ask me BEFORE planning
