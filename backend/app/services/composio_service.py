"""Composio client initialisation and toolset management."""

from __future__ import annotations

import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

_toolset = None


def get_toolset():
    """Return the singleton ComposioToolSet, or None if not configured.

    The toolset is initialised lazily on first call and reused across
    requests.  Returns None when COMPOSIO_API_KEY is absent so the rest
    of the application can degrade gracefully without crashing.
    """
    global _toolset  # noqa: PLW0603

    if _toolset is not None:
        return _toolset

    if not settings.composio_api_key:
        logger.warning("composio_not_configured", reason="COMPOSIO_API_KEY not set")
        return None

    try:
        from composio_langgraph import ComposioToolSet  # type: ignore[import-untyped]

        _toolset = ComposioToolSet(api_key=settings.composio_api_key)
        logger.info("composio_initialised")
    except Exception as exc:  # noqa: BLE001
        logger.error("composio_init_failed", error=str(exc))
        return None

    return _toolset


def reset_toolset() -> None:
    """Reset the cached toolset (used in tests)."""
    global _toolset  # noqa: PLW0603
    _toolset = None
