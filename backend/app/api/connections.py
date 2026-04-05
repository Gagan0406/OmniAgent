"""OAuth connection management routes."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.auth import get_or_create_entity_id
from app.services.composio_service import get_composio
from app.tools.composio_tools import clear_tool_cache

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
        user_id: The internal user ID (passed as a query param).
    """
    composio = get_composio()
    if composio is None:
        return ConnectionsResponse(user_id=user_id, connections=[])

    entity_id = await get_or_create_entity_id(user_id)

    try:
        result = composio.connected_accounts.list(user_ids=[entity_id])
        connections = [
            ConnectionStatus(
                app=conn.toolkit.slug,
                connected=conn.status == "ACTIVE",
                status=conn.status,
            )
            for conn in result.items
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

    Looks up the default Composio-managed auth config for the given app,
    then returns a redirect URL the frontend should send the user to.

    Args:
        app_name: Composio toolkit slug e.g. "gmail", "notion", "slack".
        user_id: The internal user ID.
    """
    composio = get_composio()
    if composio is None:
        raise HTTPException(
            status_code=503,
            detail="Composio is not configured. Set COMPOSIO_API_KEY to enable integrations.",
        )

    entity_id = await get_or_create_entity_id(user_id)

    try:
        # Find an existing auth config for this toolkit, or create one on-the-fly
        # using Composio-managed OAuth credentials (no user setup required).
        auth_config_response = composio.auth_configs.list(toolkit_slug=app_name)
        if auth_config_response.items:
            auth_config_id: str = auth_config_response.items[0].id
        else:
            created = composio.auth_configs.create(
                toolkit=app_name,
                options={"type": "use_composio_managed_auth"},
            )
            auth_config_id = created.id

        connection_request = composio.connected_accounts.link(
            user_id=entity_id,
            auth_config_id=auth_config_id,
        )
        redirect_url: str = connection_request.redirect_url or ""
    except HTTPException:
        raise
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

    clear_tool_cache(entity_id)
    logger.info("connection_initiated", app=app_name, user_id=user_id)
    return InitiateConnectionResponse(app=app_name, redirect_url=redirect_url)


@router.delete("/{app_name}", status_code=204)
async def disconnect(
    app_name: str,
    user_id: str = Query(..., min_length=1),
) -> None:
    """Disconnect a service for a user.

    Args:
        app_name: Composio toolkit slug to disconnect.
        user_id: The internal user ID.
    """
    composio = get_composio()
    if composio is None:
        raise HTTPException(status_code=503, detail="Composio is not configured.")

    entity_id = await get_or_create_entity_id(user_id)

    try:
        result = composio.connected_accounts.list(user_ids=[entity_id])
        target = next((c for c in result.items if c.toolkit.slug == app_name), None)
        if target:
            composio.connected_accounts.delete(target.id)
            logger.info("connection_deleted", app=app_name, user_id=user_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("disconnect_failed", app=app_name, user_id=user_id, error=str(exc))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to disconnect '{app_name}': {exc}",
        ) from exc
