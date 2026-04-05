"""Lightweight capability catalog and narrow tool loading helpers."""

from __future__ import annotations

import time
from collections.abc import Sequence
from dataclasses import dataclass

import structlog
from langchain_core.tools import BaseTool

from app.services.auth import get_or_create_entity_id
from app.services.composio_service import get_composio

logger = structlog.get_logger(__name__)

_CACHE_TTL = 60
_connected_services_cache: dict[str, tuple[float, set[str]]] = {}
_selected_tools_cache: dict[tuple[str, tuple[str, ...]], tuple[float, list[BaseTool]]] = {}

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

_TOOLKIT_BASED_SLUGS = {"discord", "zoom", "googledrive", "googlemeet", "googledocs"}
_TOOLKIT_LIMIT = 3


@dataclass(frozen=True)
class ServiceCapability:
    """Lightweight service metadata shown to the classifier."""

    slug: str
    capability_id: str
    description: str


SERVICE_CAPABILITIES: dict[str, ServiceCapability] = {
    "gmail": ServiceCapability(
        slug="gmail",
        capability_id="service:gmail",
        description="Read inbox email, fetch email details, draft email, or send email.",
    ),
    "googlecalendar": ServiceCapability(
        slug="googlecalendar",
        capability_id="service:googlecalendar",
        description="List, create, and delete Google Calendar events.",
    ),
    "notion": ServiceCapability(
        slug="notion",
        capability_id="service:notion",
        description="Search, read, and create Notion pages.",
    ),
    "slack": ServiceCapability(
        slug="slack",
        capability_id="service:slack",
        description="List Slack channels and send Slack messages.",
    ),
    "discord": ServiceCapability(
        slug="discord",
        capability_id="service:discord",
        description="Use connected Discord tools for messaging or server workflows.",
    ),
    "zoom": ServiceCapability(
        slug="zoom",
        capability_id="service:zoom",
        description="Use connected Zoom tools for meeting workflows.",
    ),
    "googledrive": ServiceCapability(
        slug="googledrive",
        capability_id="service:googledrive",
        description="Use connected Google Drive tools for file lookup or storage actions.",
    ),
    "googlemeet": ServiceCapability(
        slug="googlemeet",
        capability_id="service:googlemeet",
        description="Use connected Google Meet tools for meeting creation or inspection.",
    ),
    "googledocs": ServiceCapability(
        slug="googledocs",
        capability_id="service:googledocs",
        description="Use connected Google Docs tools for document workflows.",
    ),
}


def clear_tool_selection_cache(entity_id: str) -> None:
    """Clear connected-service and selected-tool caches for one entity."""

    _connected_services_cache.pop(entity_id, None)
    stale_keys = [key for key in _selected_tools_cache if key[0] == entity_id]
    for key in stale_keys:
        _selected_tools_cache.pop(key, None)


async def get_connected_service_slugs(user_id: str) -> set[str]:
    """Return the connected Composio service slugs for a user."""

    composio = get_composio()
    if composio is None:
        return set()

    entity_id = await get_or_create_entity_id(user_id)
    cached = _connected_services_cache.get(entity_id)
    if cached and time.monotonic() - cached[0] < _CACHE_TTL:
        return cached[1]

    try:
        result = composio.connected_accounts.list(user_ids=[entity_id])
        connected_slugs = {
            conn.toolkit.slug.lower()
            for conn in result.items
            if conn.status == "ACTIVE"
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("connected_accounts_fetch_failed", user_id=user_id, error=str(exc))
        return set()

    _connected_services_cache[entity_id] = (time.monotonic(), connected_slugs)
    return connected_slugs


async def get_tools_for_services(user_id: str, service_slugs: Sequence[str]) -> list[BaseTool]:
    """Return only the tools required for the selected connected services."""

    composio = get_composio()
    if composio is None:
        return []

    entity_id = await get_or_create_entity_id(user_id)
    connected_slugs = await get_connected_service_slugs(user_id)
    selected_slugs = sorted({slug.lower() for slug in service_slugs} & connected_slugs)
    if not selected_slugs:
        return []

    cache_key = (entity_id, tuple(selected_slugs))
    cached = _selected_tools_cache.get(cache_key)
    if cached and time.monotonic() - cached[0] < _CACHE_TTL:
        return cached[1]

    tools: list[BaseTool] = []
    selected_named_actions: list[str] = []
    for slug in selected_slugs:
        selected_named_actions.extend(_NAMED_ACTIONS_BY_SLUG.get(slug, []))

    if selected_named_actions:
        try:
            named_tools: list[BaseTool] = composio.tools.get(
                user_id=entity_id,
                tools=selected_named_actions,
            )
            tools.extend(named_tools)
        except Exception as exc:  # noqa: BLE001
            logger.warning("named_tools_load_failed", user_id=user_id, error=str(exc))

    for slug in selected_slugs:
        if slug not in _TOOLKIT_BASED_SLUGS:
            continue
        try:
            toolkit_tools: list[BaseTool] = composio.tools.get(
                user_id=entity_id,
                toolkits=[slug],
                limit=_TOOLKIT_LIMIT,
            )
            tools.extend(toolkit_tools)
        except Exception as exc:  # noqa: BLE001
            logger.warning("toolkit_load_failed", toolkit=slug, user_id=user_id, error=str(exc))

    _selected_tools_cache[cache_key] = (time.monotonic(), tools)
    return tools
