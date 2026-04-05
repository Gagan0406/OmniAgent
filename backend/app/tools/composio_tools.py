"""Composio-backed tools — loaded only for services the user has connected."""

from __future__ import annotations

import time
import structlog
from langchain_core.tools import BaseTool

from app.services.auth import get_or_create_entity_id
from app.services.composio_service import get_composio

# Cache tool lists per entity_id for 60 s to avoid double-fetching within
# the same agent turn (router node + tool_executor node both call get_user_tools).
_tool_cache: dict[str, tuple[float, list[BaseTool]]] = {}
_CACHE_TTL = 60  # seconds

logger = structlog.get_logger(__name__)

# Named actions per toolkit slug — only loaded when that slug is connected.
_NAMED_ACTIONS_BY_SLUG: dict[str, list[str]] = {
    "gmail": [
        "GMAIL_FETCH_EMAILS",
        "GMAIL_SEND_EMAIL",
        "GMAIL_CREATE_EMAIL_DRAFT",
        "GMAIL_GET_ATTACHMENT",
    ],
    "googlecalendar": [
        "GOOGLECALENDAR_LIST_EVENTS",
        "GOOGLECALENDAR_CREATE_EVENT",
        "GOOGLECALENDAR_DELETE_EVENT",
    ],
    "notion": [
        "NOTION_SEARCH_NOTION_PAGE",
        "NOTION_GET_NOTION_PAGE",
        "NOTION_CREATE_NOTION_PAGE",
    ],
    "slack": [
        "SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL",
        "SLACK_LIST_ALL_SLACK_TEAM_CHANNELS_WITH_VARIOUS_FILTERING_AND_PAGINATION_OPTIONS",
    ],
}

# Toolkit-based slugs loaded with a cap of 3 tools each.
_TOOLKIT_BASED_SLUGS = ["discord", "zoom", "googledrive", "googlemeet", "googledocs"]
_TOOLKIT_LIMIT = 3


def clear_tool_cache(entity_id: str) -> None:
    """Remove the cached tool list for an entity so the next call reloads fresh.

    Call this immediately after a new service connection is initiated so that
    the next agent turn picks up the newly connected service's tools.

    Args:
        entity_id: Composio entity ID whose cache entry should be evicted.
    """
    _tool_cache.pop(entity_id, None)
    logger.info("tool_cache_cleared", entity_id=entity_id)


async def get_user_tools(user_id: str) -> list[BaseTool]:
    """Return only tools for services the user has actively connected.

    Fetches the user's connected accounts first, then loads tool schemas
    only for those services — keeping the LLM context small.

    Args:
        user_id: Internal user ID used to resolve the Composio entity.

    Returns:
        List of LangChain-compatible tools ready to bind to the LLM.
        Empty list when Composio is not configured or no services are connected.
    """
    composio = get_composio()
    if composio is None:
        return []

    entity_id = await get_or_create_entity_id(user_id)

    # Return cached tools if still fresh (avoids double-fetch per agent turn).
    cached = _tool_cache.get(entity_id)
    if cached and time.monotonic() - cached[0] < _CACHE_TTL:
        logger.debug("tools_cache_hit", user_id=user_id, count=len(cached[1]))
        return cached[1]

    # --- Discover which services this user has connected ------------------
    connected_slugs: set[str] = set()
    try:
        result = composio.connected_accounts.list(user_ids=[entity_id])
        connected_slugs = {
            conn.toolkit.slug.lower()
            for conn in result.items
            if conn.status == "ACTIVE"
        }
        logger.info("connected_services", user_id=user_id, slugs=list(connected_slugs))
    except Exception as exc:  # noqa: BLE001
        logger.warning("connected_accounts_fetch_failed", user_id=user_id, error=str(exc))
        return []

    if not connected_slugs:
        logger.info("no_connected_services", user_id=user_id)
        return []

    tools: list[BaseTool] = []

    # --- Named actions: only for connected slugs with pinned action lists --
    connected_named_actions: list[str] = []
    for slug, actions in _NAMED_ACTIONS_BY_SLUG.items():
        if slug in connected_slugs:
            connected_named_actions.extend(actions)

    if connected_named_actions:
        try:
            named: list[BaseTool] = composio.tools.get(
                user_id=entity_id,
                tools=connected_named_actions,
            )
            tools.extend(named)
        except Exception as exc:  # noqa: BLE001
            logger.warning("named_tools_load_failed", user_id=user_id, error=str(exc))

    # --- Toolkit-based: only for connected slugs, capped at 3 each --------
    for slug in _TOOLKIT_BASED_SLUGS:
        if slug not in connected_slugs:
            continue
        try:
            tk_tools: list[BaseTool] = composio.tools.get(
                user_id=entity_id,
                toolkits=[slug],
                limit=_TOOLKIT_LIMIT,
            )
            tools.extend(tk_tools)
        except Exception as exc:  # noqa: BLE001
            logger.warning("toolkit_load_failed", toolkit=slug, user_id=user_id, error=str(exc))

    _tool_cache[entity_id] = (time.monotonic(), tools)
    logger.info("composio_tools_loaded", user_id=user_id, count=len(tools))
    return tools
