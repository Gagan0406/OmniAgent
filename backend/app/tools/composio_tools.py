"""Composio-backed tools for SaaS integrations (Gmail, Calendar, Notion, Slack)."""

from __future__ import annotations

import structlog
from langchain_core.tools import BaseTool

from app.services.auth import get_or_create_entity_id
from app.services.composio_service import get_toolset

logger = structlog.get_logger(__name__)

# Composio action names for each supported service.
# These are passed to toolset.get_tools() to get LangChain-compatible tool objects.
_GMAIL_ACTIONS = [
    "GMAIL_FETCH_EMAILS",
    "GMAIL_SEND_EMAIL",
    "GMAIL_CREATE_EMAIL_DRAFT",
    "GMAIL_GET_ATTACHMENT",
]

_GOOGLE_CALENDAR_ACTIONS = [
    "GOOGLECALENDAR_LIST_EVENTS",
    "GOOGLECALENDAR_CREATE_EVENT",
    "GOOGLECALENDAR_DELETE_EVENT",
]

_NOTION_ACTIONS = [
    "NOTION_SEARCH_NOTION_PAGE",
    "NOTION_GET_NOTION_PAGE",
    "NOTION_CREATE_NOTION_PAGE",
]

_SLACK_ACTIONS = [
    "SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL",
    "SLACK_LIST_ALL_SLACK_TEAM_CHANNELS_WITH_VARIOUS_FILTERING_AND_PAGINATION_OPTIONS",
]

_ALL_ACTIONS = [
    *_GMAIL_ACTIONS,
    *_GOOGLE_CALENDAR_ACTIONS,
    *_NOTION_ACTIONS,
    *_SLACK_ACTIONS,
]


async def get_user_tools(user_id: str) -> list[BaseTool]:
    """Return Composio-backed tools scoped to a specific user.

    Returns an empty list when Composio is not configured or the user has
    not connected any services — the agent degrades gracefully without
    crashing.

    Args:
        user_id: The internal user ID used to resolve the Composio entity.

    Returns:
        List of LangChain-compatible tool objects ready to bind to the LLM.
    """
    toolset = get_toolset()
    if toolset is None:
        return []

    entity_id = await get_or_create_entity_id(user_id)

    try:
        tools: list[BaseTool] = toolset.get_tools(
            actions=_ALL_ACTIONS,
            entity_id=entity_id,
        )
        logger.info("composio_tools_loaded", user_id=user_id, count=len(tools))
        return tools
    except Exception as exc:  # noqa: BLE001
        logger.warning("composio_tools_unavailable", user_id=user_id, error=str(exc))
        return []
