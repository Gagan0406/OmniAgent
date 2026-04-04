"""Chat API routes."""

from __future__ import annotations

from uuid import uuid4

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from app.agents.graph import compiled_graph

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """Request schema for non-streaming chat calls."""

    user_id: str = Field(min_length=1)
    message: str = Field(min_length=1)


class ChatResponse(BaseModel):
    """Response schema for non-streaming chat calls."""

    user_id: str
    reply: str


async def _run_graph(user_id: str, message: str, thread_id: str) -> str:
    """Invoke the compiled LangGraph agent and return the final text reply.

    Args:
        user_id: The authenticated user ID.
        message: The user's chat message.
        thread_id: Stable identifier for this conversation thread. The same
                   thread_id must be reused across turns so the checkpointer
                   can provide conversation memory.
    """
    result = await compiled_graph.ainvoke(
        {
            "messages": [HumanMessage(content=message)],
            "user_id": user_id,
        },
        config={"configurable": {"thread_id": thread_id}},
    )

    final_message = result["messages"][-1]
    return str(final_message.content)


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Execute one chat turn and return the final reply.

    Uses a fixed thread_id per user so the agent retains context across HTTP calls.
    """
    thread_id = f"http-{request.user_id}"
    reply = await _run_graph(request.user_id, request.message, thread_id)
    return ChatResponse(user_id=request.user_id, reply=reply)


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket) -> None:
    """Handle a JSON WebSocket chat stream.

    Each WebSocket connection gets its own session ID so the agent maintains
    conversation context across all messages sent in the same session.
    """
    await websocket.accept()

    # One stable thread_id per WebSocket connection — enables multi-turn memory.
    session_id = uuid4().hex
    thread_id: str | None = None  # set on first message once user_id is known

    try:
        while True:
            payload = ChatRequest.model_validate(await websocket.receive_json())

            if thread_id is None:
                thread_id = f"ws-{payload.user_id}-{session_id}"
                logger.info("ws_session_started", user_id=payload.user_id, thread_id=thread_id)

            await websocket.send_json({"type": "status", "message": "processing"})
            reply = await _run_graph(payload.user_id, payload.message, thread_id)
            await websocket.send_json(
                {"type": "final", "message": reply, "user_id": payload.user_id}
            )
    except WebSocketDisconnect:
        logger.info("ws_session_closed", thread_id=thread_id)
        return
