"""Composio-backed tools for SaaS integrations (Gmail, Calendar, Notion, Slack, Discord, Zoom, Drive, Meet, Docs)."""

from __future__ import annotations

import structlog
from langchain_core.tools import BaseTool

from app.services.auth import get_or_create_entity_id
from app.services.composio_service import get_composio

logger = structlog.get_logger(__name__)

# Explicit tool slugs for verified integrations.
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

_NAMED_ACTIONS = [
    *_GMAIL_ACTIONS,
    *_GOOGLE_CALENDAR_ACTIONS,
    *_NOTION_ACTIONS,
    *_SLACK_ACTIONS,
]

# These toolkits are loaded by slug, hard-capped at 3 tools each
# to avoid blowing the LLM context / token-per-minute limit.
_TOOLKIT_BASED = ["discord", "zoom", "googledrive", "googlemeet", "googledocs"]
_TOOLKIT_LIMIT = 3


async def get_user_tools(user_id: str) -> list[BaseTool]:
    """Return Composio-backed tools scoped to a specific user.

    Loads named actions for Gmail/Calendar/Notion/Slack, then adds up to
    3 tools each for Discord, Zoom, Google Drive, Google Meet, and Google Docs.
    Total is capped well below the free-tier Groq token limit.

    Returns an empty list when Composio is not configured or unavailable.

    Args:
        user_id: The internal user ID used to resolve the Composio entity.

    Returns:
        List of LangChain-compatible tool objects ready to bind to the LLM.
    """
    composio = get_composio()
    if composio is None:
        return []

    entity_id = await get_or_create_entity_id(user_id)

    tools: list[BaseTool] = []

    # --- Named / verified actions ----------------------------------------
    try:
        named: list[BaseTool] = composio.tools.get(
            user_id=entity_id,
            tools=_NAMED_ACTIONS,
        )
        tools.extend(named)
    except Exception as exc:  # noqa: BLE001
        logger.warning("composio_named_tools_unavailable", user_id=user_id, error=str(exc))

    # --- Toolkit-based loading: 3 tools per toolkit ----------------------
    for toolkit in _TOOLKIT_BASED:
        try:
            tk_tools: list[BaseTool] = composio.tools.get(
                user_id=entity_id,
                toolkits=[toolkit],
                limit=_TOOLKIT_LIMIT,
            )
            tools.extend(tk_tools)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "composio_toolkit_unavailable",
                toolkit=toolkit,
                user_id=user_id,
                error=str(exc),
            )

    logger.info("composio_tools_loaded", user_id=user_id, count=len(tools))
    return tools
