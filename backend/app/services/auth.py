"""User authentication and Composio entity ID mapping.

Persists the user_id → entity_id mapping in SQLite so it survives restarts.
Falls back gracefully if the DB is unavailable (test environments).
"""

from __future__ import annotations

import structlog
from sqlalchemy import select

from app.db.database import SessionLocal
from app.db.models import User

logger = structlog.get_logger(__name__)


async def get_or_create_entity_id(user_id: str) -> str:
    """Return the Composio entity ID for a user, creating it if needed.

    Uses the user_id as the Composio entity ID (Composio accepts arbitrary strings).
    Persists the mapping in SQLite so it survives server restarts.

    Args:
        user_id: The internal application user ID (from NextAuth token.sub).

    Returns:
        The Composio entity ID to use for this user's tool calls.
    """
    try:
        async with SessionLocal() as session:
            result = await session.execute(select(User).where(User.user_id == user_id))
            user = result.scalar_one_or_none()

            if user is not None:
                return user.entity_id

            # First time this user is seen — create the mapping.
            entity_id = user_id
            new_user = User(user_id=user_id, entity_id=entity_id)
            session.add(new_user)
            await session.commit()

            logger.info("entity_id_created", user_id=user_id, entity_id=entity_id)
            return entity_id

    except Exception as exc:  # noqa: BLE001
        # DB unavailable (e.g. tests without a real DB) — fall back to in-memory.
        logger.warning("db_unavailable_falling_back", user_id=user_id, error=str(exc))
        return user_id


async def update_user_profile(user_id: str, email: str | None, name: str | None) -> None:
    """Update the email and display name for a registered user.

    Args:
        user_id: The internal application user ID.
        email: User's email address from NextAuth session.
        name: User's display name from NextAuth session.
    """
    try:
        async with SessionLocal() as session:
            result = await session.execute(select(User).where(User.user_id == user_id))
            user = result.scalar_one_or_none()

            if user is not None:
                user.email = email
                user.name = name
                await session.commit()
                logger.info("user_profile_updated", user_id=user_id, email=email)

    except Exception as exc:  # noqa: BLE001
        logger.warning("profile_update_failed", user_id=user_id, error=str(exc))
