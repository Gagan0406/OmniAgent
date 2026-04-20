"""Chat API routes."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Annotated
from uuid import uuid4

import structlog
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from langchain_core.messages import HumanMessage
from langchain_core.tools import BaseTool
from langchain_openai import ChatOpenAI
from openai import BadRequestError
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import compiled_graph
from app.agents.state import PendingConfirmation
from app.config import settings
from app.db.database import SessionLocal, get_db_session
from app.db.models import Conversation, Message
from app.tools import get_tools_for_capabilities

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


_pending_confirmations: dict[str, PendingConfirmation] = {}
_CONFIRM_WORDS = {"confirm", "yes", "send", "approve", "ok", "go ahead"}
_CANCEL_WORDS = {"cancel", "stop", "no", "discard", "abort"}


def _make_llm() -> ChatOpenAI:
    """Create the shared OpenRouter client for draft instruction edits."""

    return ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.openrouter_api_key,
        base_url="https://openrouter.ai/api/v1",
        temperature=0,
        max_retries=3,
    )


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

    now = datetime.now(UTC)
    if existing is None:
        title = first_message[:50].strip()
        db.add(
            Conversation(
                id=thread_id,
                user_id=user_id,
                title=title,
                created_at=now,
                updated_at=now,
            )
        )
    else:
        existing.updated_at = now

    await db.commit()


async def _save_messages(
    db: AsyncSession,
    thread_id: str,
    user_msg: str,
    assistant_msg: str,
) -> None:
    """Persist both sides of a chat turn to the messages table."""
    now = datetime.now(UTC)
    db.add(Message(conversation_id=thread_id, role="user", content=user_msg, created_at=now))
    db.add(
        Message(
            conversation_id=thread_id,
            role="assistant",
            content=assistant_msg,
            created_at=now,
        )
    )
    await db.commit()


def _build_tool_registry(tools: list[BaseTool]) -> dict[str, BaseTool]:
    """Index tools by name for quick lookup."""

    return {tool.name: tool for tool in tools}


def _parse_confirmation_intent(message: str) -> str:
    """Classify the user's confirmation turn as confirm/cancel/edit."""

    lowered = message.strip().lower()
    if lowered in _CONFIRM_WORDS:
        return "confirm"
    if lowered in _CANCEL_WORDS:
        return "cancel"
    return "edit"


def _update_pending_draft(
    pending: PendingConfirmation,
    edited_text: str,
) -> PendingConfirmation:
    """Return a copy of pending confirmation with updated draft text."""

    parsed_args = {}
    try:
        parsed_args = dict(json.loads(pending["arguments_json"]))
    except Exception:  # noqa: BLE001
        parsed_args = {}

    parsed_args[pending["draft_field"]] = edited_text
    updated_json = json.dumps(parsed_args, sort_keys=True, default=str)
    return {
        **pending,
        "arguments_json": updated_json,
        "draft_text": edited_text,
    }


async def _apply_instruction_to_draft(
    pending: PendingConfirmation,
    instruction: str,
) -> str:
    """Apply a natural-language edit instruction to the current draft."""

    current_draft = pending.get("draft_text", "")
    prompt = (
        "You are editing a message draft.\n"
        "Apply the user's instruction exactly.\n"
        "Return only the updated draft text.\n"
        "Do not add commentary."
    )
    user_content = (
        f"Current draft:\n{current_draft}\n\n"
        f"Instruction:\n{instruction}\n\n"
        "Updated draft:"
    )

    try:
        response = await _make_llm().ainvoke([HumanMessage(content=f"{prompt}\n\n{user_content}")])
        updated = str(response.content).strip()
        if updated:
            return updated
    except (BadRequestError, ValueError) as exc:
        logger.warning("draft_instruction_fallback", error=str(exc))
    except Exception:  # noqa: BLE001
        logger.exception("draft_instruction_failed")

    return current_draft


async def _execute_pending_confirmation(
    user_id: str,
    pending: PendingConfirmation,
) -> str:
    """Execute a previously paused tool call after explicit user confirmation."""

    tools = list(
        await get_tools_for_capabilities(user_id, pending.get("selected_capability_ids", []))
    )
    registry = _build_tool_registry(tools)
    tool = registry.get(pending["tool_name"])
    if tool is None:
        return "I couldn't execute the draft because the required tool is unavailable now."

    try:
        tool_args = dict(json.loads(pending["arguments_json"]))
    except Exception:  # noqa: BLE001
        return "I couldn't execute the draft because its arguments could not be parsed."

    try:
        result = await tool.ainvoke(tool_args)
        return f"Sent successfully.\n\nTool result:\n{result}"
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "pending_confirmation_execution_failed",
            tool=pending["tool_name"],
            user_id=user_id,
        )
        return f"I tried to send it, but the tool failed: {exc}"


async def _run_graph(
    user_id: str,
    message: str,
    thread_id: str,
) -> tuple[str, PendingConfirmation | None]:
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
    return str(final_message.content), result.get("pending_confirmation")


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
            updated_at=row.updated_at.replace(tzinfo=UTC),
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
        updated_at=row.updated_at.replace(tzinfo=UTC),
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
            created_at=row.created_at.replace(tzinfo=UTC),
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
    reply, _ = await _run_graph(request.user_id, request.message, thread_id)
    return ChatResponse(user_id=request.user_id, reply=reply)


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket) -> None:
    """Handle a JSON WebSocket chat stream.

    Each WebSocket connection gets its own session ID so the agent maintains
    conversation context across all messages sent in the same session.
    """
    await websocket.accept()

    session_id = uuid4().hex
    thread_id: str | None = None

    try:
        while True:
            payload = ChatRequest.model_validate(await websocket.receive_json())

            if thread_id is None:
                thread_id = payload.thread_id or f"ws-{payload.user_id}-{session_id}"
                logger.info("ws_session_started", user_id=payload.user_id, thread_id=thread_id)

            async with SessionLocal() as db_session:
                await _upsert_conversation(db_session, thread_id, payload.user_id, payload.message)

            await websocket.send_json({"type": "status", "message": "processing"})
            pending = _pending_confirmations.get(thread_id)
            if pending:
                intent = _parse_confirmation_intent(payload.message)
                if intent == "cancel":
                    _pending_confirmations.pop(thread_id, None)
                    reply = "Draft canceled. I did not send anything."
                elif intent == "confirm":
                    reply = await _execute_pending_confirmation(payload.user_id, pending)
                    _pending_confirmations.pop(thread_id, None)
                else:
                    rewritten = await _apply_instruction_to_draft(pending, payload.message)
                    updated = _update_pending_draft(pending, rewritten)
                    _pending_confirmations[thread_id] = updated
                    reply = (
                        "I updated the draft using your instruction. "
                        "Reply `confirm` to send, `cancel` to stop, or give another instruction."
                    )
                    await websocket.send_json(
                        {
                            "type": "confirmation_required",
                            "tool_name": updated["tool_name"],
                            "draft": updated["draft_text"],
                        }
                    )
            else:
                reply, new_pending = await _run_graph(payload.user_id, payload.message, thread_id)
                if new_pending:
                    _pending_confirmations[thread_id] = new_pending
                    await websocket.send_json(
                        {
                            "type": "confirmation_required",
                            "tool_name": new_pending["tool_name"],
                            "draft": new_pending["draft_text"],
                        }
                    )
            async with SessionLocal() as db_session:
                await _save_messages(db_session, thread_id, payload.message, reply)
            await websocket.send_json(
                {"type": "final", "message": reply, "user_id": payload.user_id}
            )
    except WebSocketDisconnect:
        logger.info("ws_session_closed", thread_id=thread_id)
        return
