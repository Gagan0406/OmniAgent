"""Auth routes — user registration and session setup."""

from __future__ import annotations

import structlog
from fastapi import APIRouter

from app.models.user import UserRegisterRequest, UserRegisterResponse
from app.services.auth import get_or_create_entity_id

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRegisterResponse)
async def register_user(payload: UserRegisterRequest) -> UserRegisterResponse:
    """Register or retrieve a user's Composio entity mapping.

    Called by the frontend immediately after a successful NextAuth sign-in.
    Idempotent — safe to call on every session start.

    Args:
        payload: The user's ID (from NextAuth token.sub) and optional profile info.

    Returns:
        The user's internal ID and their Composio entity ID.
    """
    entity_id = await get_or_create_entity_id(payload.user_id)

    logger.info(
        "user_registered",
        user_id=payload.user_id,
        email=payload.email,
        entity_id=entity_id,
    )

    return UserRegisterResponse(user_id=payload.user_id, entity_id=entity_id)
