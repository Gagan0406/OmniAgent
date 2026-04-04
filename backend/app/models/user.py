"""User models."""

from __future__ import annotations

from pydantic import BaseModel


class UserRegisterRequest(BaseModel):
    """Payload sent by the frontend after a successful NextAuth sign-in."""

    user_id: str
    email: str | None = None
    name: str | None = None


class UserRegisterResponse(BaseModel):
    """Confirmed user registration with their Composio entity ID."""

    user_id: str
    entity_id: str
