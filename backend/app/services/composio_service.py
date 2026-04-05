"""Composio client initialisation and toolset management."""

from __future__ import annotations

import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

_composio = None


def get_composio():
    """Return the singleton Composio client, or None if not configured.

    Initialised lazily on first call and reused across requests.
    Returns None when COMPOSIO_API_KEY is absent so the rest of the
    application degrades gracefully without crashing.
    """
    global _composio  # noqa: PLW0603

    if _composio is not None:
        return _composio

    if not settings.composio_api_key:
        logger.warning("composio_not_configured", reason="COMPOSIO_API_KEY not set")
        return None

    try:
        from composio import Composio  # type: ignore[import-untyped]
        from composio_langgraph import LanggraphProvider  # type: ignore[import-untyped]

        _composio = Composio(
            provider=LanggraphProvider(),
            api_key=settings.composio_api_key,
        )
        logger.info("composio_initialised")
    except Exception as exc:  # noqa: BLE001
        logger.error("composio_init_failed", error=str(exc))
        return None

    return _composio


# Backward-compatible alias used by connections.py
get_toolset = get_composio


def reset_toolset() -> None:
    """Reset the cached Composio client (used in tests)."""
    global _composio  # noqa: PLW0603
    _composio = None
