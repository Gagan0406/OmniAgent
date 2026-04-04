"""User authentication and Composio entity ID mapping.

Phase 1B uses an in-memory mapping.  Phase 2 will persist this in the
database once the User model and Alembic migrations are in place.
"""

from __future__ import annotations

import structlog

logger = structlog.get_logger(__name__)

# user_id → composio entity_id
# Composio entity IDs are different from our user IDs — always resolve here,
# never trust entity IDs passed from the frontend.
_entity_map: dict[str, str] = {}


async def get_or_create_entity_id(user_id: str) -> str:
    """Return the Composio entity ID for a user.

    Creates a mapping on first call using the user_id as the entity_id
    (Composio accepts arbitrary strings as entity IDs).

    Args:
        user_id: The internal application user ID.

    Returns:
        The Composio entity ID to use for this user's tool calls.
    """
    if user_id not in _entity_map:
        _entity_map[user_id] = user_id
        logger.info("entity_id_created", user_id=user_id, entity_id=user_id)

    return _entity_map[user_id]


async def set_entity_id(user_id: str, entity_id: str) -> None:
    """Explicitly map a user ID to a Composio entity ID.

    Args:
        user_id: The internal application user ID.
        entity_id: The Composio entity ID to associate with this user.
    """
    _entity_map[user_id] = entity_id
    logger.info("entity_id_updated", user_id=user_id, entity_id=entity_id)
