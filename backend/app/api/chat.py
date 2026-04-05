"""Chat API routes."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from uuid import uuid4

import structlog
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import compiled_graph
from app.db.database import SessionLocal, get_db_session
from app.db.models import Conversation, Message

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """Request schema for non-streaming chat calls."""

    user_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
    # Optional: client may supply a thread_id to resume a previous conversation.
    # When absent the server generates one from the connection's session_id.
    thread_id: str | None = Field(default=None)


class ChatResponse(BaseModel):
    """Response schema for non-streaming chat calls."""

    user_id: str
    reply: str


class ConversationSummary(BaseModel):
    """Compact conversation record returned by the history endpoint."""

    id: str
    title: str
    updated_at: datetime


class MessageRecord(BaseModel):
    """A single persisted chat message."""

    id: str
    role: str
    content: str
    created_at: datetime


async def _upsert_conversation(
    db: AsyncSession,
    thread_id: str,
    user_id: str,
    first_message: str,
) -> None:
    """Create or touch the Conversation row for the given thread.

    On first call the row is inserted with a title derived from the opening
    message.  On subsequent calls only ``updated_at`` is refreshed so the
    title stays stable.
    """
    result = await db.execute(select(Conversation).where(Conversation.id == thread_id))
    existing = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if existing is None:
        title = first_message[:50].strip()
        db.add(Conversation(id=thread_id, user_id=user_id, title=title, created_at=now, updated_at=now))
    else:
        existing.updated_at = now

    await db.commit()


async def _save_messages(db: AsyncSession, thread_id: str, user_msg: str, assistant_msg: str) -> None:
    """Persist both sides of a chat turn to the messages table."""
    now = datetime.now(timezone.utc)
    db.add(Message(conversation_id=thread_id, role="user", content=user_msg, created_at=now))
    db.add(Message(conversation_id=thread_id, role="assistant", content=assistant_msg, created_at=now))
    await db.commit()


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


@router.get("/history", response_model=list[ConversationSummary])
async def get_chat_history(
    user_id: Annotated[str, Query(min_length=1)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[ConversationSummary]:
    """Return the 20 most recent conversation sessions for a user.

    Ordered by ``updated_at`` descending so the newest session appears first.
    """
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .limit(20)
    )
    rows = result.scalars().all()
    return [
        # SQLite drops timezone info; re-attach UTC so the frontend calculates
        # relative times correctly regardless of the user's local timezone.
        ConversationSummary(
            id=row.id,
            title=row.title,
            updated_at=row.updated_at.replace(tzinfo=timezone.utc),
        )
        for row in rows
    ]


class RenameRequest(BaseModel):
    """Body for renaming a conversation."""

    title: str = Field(min_length=1, max_length=100)


@router.delete("/history/{thread_id}", status_code=204)
async def delete_conversation(
    thread_id: str,
    user_id: Annotated[str, Query(min_length=1)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> None:
    """Delete a conversation from history."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == thread_id, Conversation.user_id == user_id
        )
    )
    row = result.scalar_one_or_none()
    if row:
        await db.delete(row)
        await db.commit()


@router.patch("/history/{thread_id}", response_model=ConversationSummary)
async def rename_conversation(
    thread_id: str,
    body: RenameRequest,
    user_id: Annotated[str, Query(min_length=1)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ConversationSummary:
    """Rename a conversation."""
    from fastapi import HTTPException

    result = await db.execute(
        select(Conversation).where(
            Conversation.id == thread_id, Conversation.user_id == user_id
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    row.title = body.title.strip()
    await db.commit()
    return ConversationSummary(
        id=row.id,
        title=row.title,
        updated_at=row.updated_at.replace(tzinfo=timezone.utc),
    )


@router.get("/history/{thread_id}/messages", response_model=list[MessageRecord])
async def get_thread_messages(
    thread_id: str,
    user_id: Annotated[str, Query(min_length=1)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> list[MessageRecord]:
    """Return all messages for a conversation thread, oldest first."""
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == thread_id)
        .order_by(Message.created_at.asc())
    )
    rows = result.scalars().all()
    return [
        MessageRecord(
            id=row.id,
            role=row.role,
            content=row.content,
            created_at=row.created_at.replace(tzinfo=timezone.utc),
        )
        for row in rows
    ]


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> ChatResponse:
    """Execute one chat turn and return the final reply.

    Uses a fixed thread_id per user so the agent retains context across HTTP calls.
    """
    thread_id = f"http-{request.user_id}"
    await _upsert_conversation(db, thread_id, request.user_id, request.message)
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
    # The client may also supply an explicit thread_id on the first message to
    # resume a previous conversation from chat history.
    session_id = uuid4().hex
    thread_id: str | None = None  # set on first message once user_id is known

    try:
        while True:
            payload = ChatRequest.model_validate(await websocket.receive_json())

            if thread_id is None:
                thread_id = payload.thread_id or f"ws-{payload.user_id}-{session_id}"
                logger.info("ws_session_started", user_id=payload.user_id, thread_id=thread_id)

            # Persist / refresh the conversation record outside the graph call
            # so history is always up-to-date regardless of graph outcome.
            async with SessionLocal() as db_session:
                await _upsert_conversation(db_session, thread_id, payload.user_id, payload.message)

            await websocket.send_json({"type": "status", "message": "processing"})
            reply = await _run_graph(payload.user_id, payload.message, thread_id)
            async with SessionLocal() as db_session:
                await _save_messages(db_session, thread_id, payload.message, reply)
            await websocket.send_json(
                {"type": "final", "message": reply, "user_id": payload.user_id}
            )
    except WebSocketDisconnect:
        logger.info("ws_session_closed", thread_id=thread_id)
        return
