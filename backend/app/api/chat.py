"""Chat API routes."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from app.agents.graph import compiled_graph

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """Request schema for non-streaming chat calls."""

    user_id: str = Field(min_length=1)
    message: str = Field(min_length=1)


class ChatResponse(BaseModel):
    """Response schema for non-streaming chat calls."""

    user_id: str
    reply: str


async def _run_graph(user_id: str, message: str) -> str:
    result = await compiled_graph.ainvoke(
        {
            "messages": [HumanMessage(content=message)],
            "user_id": user_id,
        },
        config={"configurable": {"thread_id": f"{user_id}-{uuid4()}"}},
    )

    final_message = result["messages"][-1]
    return str(final_message.content)


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Execute one chat turn and return the final reply."""

    reply = await _run_graph(request.user_id, request.message)
    return ChatResponse(user_id=request.user_id, reply=reply)


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket) -> None:
    """Handle a simple JSON WebSocket chat contract."""

    await websocket.accept()

    try:
        while True:
            payload = ChatRequest.model_validate(await websocket.receive_json())
            await websocket.send_json({"type": "status", "message": "processing"})
            reply = await _run_graph(payload.user_id, payload.message)
            await websocket.send_json(
                {"type": "final", "message": reply, "user_id": payload.user_id}
            )
    except WebSocketDisconnect:
        return
