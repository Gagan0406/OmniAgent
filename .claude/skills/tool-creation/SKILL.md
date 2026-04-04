---
name: tool-creation
description: "When creating new custom tools (non-Composio) for the agent. Covers the tool function pattern, registration, and testing approach."
---

# Custom Tool Creation — Omni Copilot

## Tool Function Pattern
```python
from langchain_core.tools import tool

@tool
async def read_local_file(file_path: str) -> str:
    """Read the contents of a local file.

    Args:
        file_path: Relative path to the file to read.
    """
    sanitized = _sanitize_path(file_path)  # prevent directory traversal
    async with aiofiles.open(sanitized, "r") as f:
        content = await f.read()
    return content[:10000]  # cap output to avoid context overflow
```

## Registration (`tools/__init__.py`)
```python
from app.tools.file_tools import read_local_file, write_local_file, search_files
from app.tools.code_tools import analyze_code, grep_code
from app.tools.composio_tools import get_user_tools

CUSTOM_TOOLS = [read_local_file, write_local_file, search_files, analyze_code, grep_code]

async def get_all_tools(user_id: str) -> list:
    composio_tools = await get_user_tools(user_id)
    return CUSTOM_TOOLS + composio_tools
```

## Rules
- Every tool has a clear docstring — the LLM reads this to decide when to use it
- Cap tool output length (LLM context is finite)
- Sanitize all user-provided paths/inputs
- Tools are stateless — no instance variables, no side effects beyond the declared action
- Return strings, not complex objects — the LLM needs to read the output
