"""Tool registry for Omni Copilot."""

from __future__ import annotations

from collections.abc import Sequence

from langchain_core.tools import BaseTool

from app.tools.code_tools import grep_workspace_code
from app.tools.composio_tools import get_user_tools as get_composio_user_tools
from app.tools.file_tools import read_workspace_file, search_workspace_files

CUSTOM_TOOLS: list[BaseTool] = [
    read_workspace_file,
    search_workspace_files,
    grep_workspace_code,
]


async def get_all_tools(user_id: str) -> Sequence[BaseTool]:
    """Return all tools available to a user.

    Args:
        user_id: The internal user identifier.

    Returns:
        The Phase 1A custom tools. The parameter is retained for future
        per-user Composio tool lookup.
    """

    # Create tool instances with user workspace context
    workspace_tools = []
    for tool in CUSTOM_TOOLS:
        # This tool doesn't need user_workspaces (like composio tools)
        workspace_tools.append(tool)

    composio_tools = await get_composio_user_tools(user_id)
    return [*workspace_tools, *composio_tools]
