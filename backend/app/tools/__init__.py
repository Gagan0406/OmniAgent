"""Tool registry for Omni Copilot."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from langchain_core.tools import BaseTool

from app.tools.code_tools import grep_workspace_code
from app.tools.composio_tools import get_user_tools as get_composio_user_tools
from app.tools.file_tools import read_workspace_file, search_workspace_files
from app.tools.selection import (
    SERVICE_CAPABILITIES,
    get_connected_service_slugs,
    get_tools_for_services,
)


@dataclass(frozen=True)
class CapabilityDefinition:
    """Minimal capability metadata used by the routing agent."""

    capability_id: str
    name: str
    description: str


LOCAL_TOOL_REGISTRY: dict[str, BaseTool] = {
    "tool:read_workspace_file": read_workspace_file,
    "tool:search_workspace_files": search_workspace_files,
    "tool:grep_workspace_code": grep_workspace_code,
}

LOCAL_CAPABILITIES: dict[str, CapabilityDefinition] = {
    "tool:read_workspace_file": CapabilityDefinition(
        capability_id="tool:read_workspace_file",
        name=read_workspace_file.name,
        description="Read the contents of a specific local text file in the workspace.",
    ),
    "tool:search_workspace_files": CapabilityDefinition(
        capability_id="tool:search_workspace_files",
        name=search_workspace_files.name,
        description="Search workspace file names when the exact path is not known.",
    ),
    "tool:grep_workspace_code": CapabilityDefinition(
        capability_id="tool:grep_workspace_code",
        name=grep_workspace_code.name,
        description="Search code and markdown files for a text pattern.",
    ),
}


async def get_available_capabilities(user_id: str) -> list[CapabilityDefinition]:
    """Return the lightweight capability catalog available for this user."""

    capabilities = list(LOCAL_CAPABILITIES.values())
    connected_slugs = await get_connected_service_slugs(user_id)

    for slug in sorted(connected_slugs):
        service_capability = SERVICE_CAPABILITIES.get(slug)
        if service_capability is None:
            continue
        capabilities.append(
            CapabilityDefinition(
                capability_id=service_capability.capability_id,
                name=service_capability.slug,
                description=service_capability.description,
            )
        )

    return capabilities


async def get_tools_for_capabilities(
    user_id: str,
    capability_ids: Sequence[str],
) -> Sequence[BaseTool]:
    """Return only the tools required for the chosen capability IDs."""

    selected_ids = set(capability_ids)
    tools = [
        tool
        for capability_id, tool in LOCAL_TOOL_REGISTRY.items()
        if capability_id in selected_ids
    ]

    selected_service_slugs = [
        capability_id.removeprefix("service:")
        for capability_id in selected_ids
        if capability_id.startswith("service:")
    ]
    composio_tools = await get_tools_for_services(user_id, selected_service_slugs)
    return [*tools, *composio_tools]


async def get_all_tools(user_id: str) -> Sequence[BaseTool]:
    """Return all tools available to a user.

    Args:
        user_id: The internal user identifier.

    Returns:
        The Phase 1A custom tools. The parameter is retained for future
        per-user Composio tool lookup.
    """
    workspace_tools = list(LOCAL_TOOL_REGISTRY.values())
    composio_tools = await get_composio_user_tools(user_id)
    return [*workspace_tools, *composio_tools]
