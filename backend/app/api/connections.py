"""OAuth connection management routes."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.auth import get_or_create_entity_id
from app.services.composio_service import get_toolset

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/connections", tags=["connections"])


class ConnectionStatus(BaseModel):
    """Status of a single connected service."""

    app: str
    connected: bool
    status: str


class ConnectionsResponse(BaseModel):
    """All connected services for a user."""

    user_id: str
    connections: list[ConnectionStatus]


class InitiateConnectionResponse(BaseModel):
    """Redirect URL for beginning an OAuth flow."""

    app: str
    redirect_url: str


@router.get("", response_model=ConnectionsResponse)
async def list_connections(
    user_id: str = Query(..., min_length=1),
) -> ConnectionsResponse:
    """Return all service connections for a user.

    Args:
        user_id: The internal user ID (passed as a query param for now;
                 Phase 2 will derive this from the JWT session).
    """
    toolset = get_toolset()
    if toolset is None:
        return ConnectionsResponse(user_id=user_id, connections=[])

    entity_id = await get_or_create_entity_id(user_id)

    try:
        entity = toolset.get_entity(entity_id)
        raw_connections = entity.get_connections()
        connections = [
            ConnectionStatus(
                app=conn.appName,
                connected=conn.status == "ACTIVE",
                status=conn.status,
            )
            for conn in raw_connections
        ]
    except Exception as exc:  # noqa: BLE001
        logger.warning("list_connections_failed", user_id=user_id, error=str(exc))
        connections = []

    return ConnectionsResponse(user_id=user_id, connections=connections)


@router.post("/{app_name}/initiate", response_model=InitiateConnectionResponse)
async def initiate_connection(
    app_name: str,
    user_id: str = Query(..., min_length=1),
) -> InitiateConnectionResponse:
    """Start an OAuth flow for a service.

    Returns a redirect URL that the frontend should send the user to.

    Args:
        app_name: Composio app identifier e.g. "gmail", "notion", "slack".
        user_id: The internal user ID.
    """
    toolset = get_toolset()
    if toolset is None:
        raise HTTPException(
            status_code=503,
            detail="Composio is not configured. Set COMPOSIO_API_KEY to enable integrations.",
        )

    entity_id = await get_or_create_entity_id(user_id)

    try:
        entity = toolset.get_entity(entity_id)
        connection_request = entity.initiate_connection(app_name=app_name)
        redirect_url: str = connection_request.redirectUrl
    except Exception as exc:  # noqa: BLE001
        logger.error(
            "initiate_connection_failed",
            app=app_name,
            user_id=user_id,
            error=str(exc),
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initiate connection for '{app_name}': {exc}",
        ) from exc

    logger.info("connection_initiated", app=app_name, user_id=user_id)
    return InitiateConnectionResponse(app=app_name, redirect_url=redirect_url)


@router.delete("/{app_name}", status_code=204)
async def disconnect(
    app_name: str,
    user_id: str = Query(..., min_length=1),
) -> None:
    """Disconnect a service for a user.

    Args:
        app_name: Composio app identifier to disconnect.
        user_id: The internal user ID.
    """
    toolset = get_toolset()
    if toolset is None:
        raise HTTPException(status_code=503, detail="Composio is not configured.")

    entity_id = await get_or_create_entity_id(user_id)

    try:
        entity = toolset.get_entity(entity_id)
        connections = entity.get_connections()
        target = next((c for c in connections if c.appName == app_name), None)
        if target:
            target.delete()
            logger.info("connection_deleted", app=app_name, user_id=user_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("disconnect_failed", app=app_name, user_id=user_id, error=str(exc))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to disconnect '{app_name}': {exc}",
        ) from exc
