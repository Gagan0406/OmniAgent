"""API endpoint tests."""

from __future__ import annotations

from unittest.mock import MagicMock


def test_healthcheck_returns_ok(client) -> None:
    """The healthcheck endpoint should return a healthy payload."""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_chat_endpoint_returns_reply(client, mock_groq) -> None:
    """The HTTP chat endpoint should return a non-empty assistant reply."""
    response = client.post(
        "/api/chat",
        json={"user_id": "api-user", "message": "Hello from API"},
    )

    assert response.status_code == 200
    assert response.json()["reply"]
    assert "Omni Copilot" in response.json()["reply"]


def test_chat_websocket_returns_final_message(client, mock_groq) -> None:
    """The WebSocket endpoint should return status and final events."""
    with client.websocket_connect("/api/chat/ws") as websocket:
        websocket.send_json({"user_id": "ws-user", "message": "Read file CLAUDE.md"})
        status_event = websocket.receive_json()
        final_event = websocket.receive_json()

    assert status_event["type"] == "status"
    assert final_event["type"] == "final"
    assert final_event["message"]  # non-empty


def test_connections_endpoint_returns_empty_without_composio(client, monkeypatch) -> None:
    """Connections endpoint should return an empty list when Composio is not configured."""
    monkeypatch.setattr("app.api.connections.get_composio", MagicMock(return_value=None))
    response = client.get("/api/connections?user_id=test-user")

    assert response.status_code == 200
    assert response.json()["user_id"] == "test-user"
    assert response.json()["connections"] == []


def test_connections_initiate_returns_503_without_composio(client, monkeypatch) -> None:
    """Initiate endpoint should return 503 when Composio API key is not set."""
    monkeypatch.setattr("app.api.connections.get_composio", MagicMock(return_value=None))
    response = client.post("/api/connections/gmail/initiate?user_id=test-user")

    assert response.status_code == 503
