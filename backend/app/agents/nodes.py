"""LangGraph node implementations."""

from __future__ import annotations

import json
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import structlog
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import BaseTool
from langchain_openai import ChatOpenAI
from openai import BadRequestError
from pydantic import ValidationError

from app.agents.prompts import (
    CLASSIFIER_PROMPT,
    DIRECT_RESPONSE_PROMPT,
    SYNTHESIS_PROMPT,
    TOOL_REASONER_PROMPT,
)
from app.agents.schemas import RouteDecision
from app.agents.state import AgentState
from app.config import settings
from app.tools import CapabilityDefinition, get_available_capabilities, get_tools_for_capabilities

logger = structlog.get_logger(__name__)


def _prepend_system(prompt: str, messages: Sequence[BaseMessage]) -> list[BaseMessage]:
    """Return a message list with the prompt prepended as a system message."""

    contextual_prompt = (
        f"{prompt}\n\n{_build_time_context()}\n"
        "When the user asks for 'now', 'today', or dates/times without a timezone, "
        "default to the configured local timezone above."
    )
    return [SystemMessage(content=contextual_prompt), *messages]


def _build_time_context() -> str:
    """Build a stable runtime time context so the model doesn't assume UTC."""

    tz_name = settings.user_timezone
    try:
        local_tz = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        # Windows/embedded Python runtimes can miss IANA tz DB (`tzdata`).
        # Fallback to fixed IST offset so time-sensitive prompts still work.
        logger.warning("user_timezone_not_found_fallback_to_ist", timezone=tz_name)
        tz_name = "IST (UTC+05:30 fallback)"
        local_tz = timezone(timedelta(hours=5, minutes=30))

    local_now = datetime.now(local_tz)
    utc_now = datetime.now(UTC)
    return (
        "Runtime time context:\n"
        f"- User timezone: {tz_name}\n"
        f"- Current local datetime: {local_now.isoformat()}\n"
        f"- Current UTC datetime: {utc_now.isoformat()}"
    )


def _make_llm() -> ChatOpenAI:
    """Create the shared OpenRouter client used by the internal specialist agents."""

    return ChatOpenAI(
        model=settings.llm_model,
        api_key=settings.openrouter_api_key,
        base_url="https://openrouter.ai/api/v1",
        temperature=0,
        max_retries=5,
    )


def _recent_messages(
    messages: Sequence[BaseMessage],
    *,
    max_messages: int = 10,
    max_tool_messages: int = 4,
) -> list[BaseMessage]:
    """Keep a compact recent context window so tool-heavy threads stay small."""

    selected: list[BaseMessage] = []
    tool_count = 0

    for message in reversed(messages):
        if isinstance(message, SystemMessage):
            continue
        if isinstance(message, ToolMessage):
            if tool_count >= max_tool_messages:
                continue
            tool_count += 1

        selected.append(message)
        if len(selected) >= max_messages:
            break

    return list(reversed(selected))


def _format_capabilities(capabilities: Sequence[CapabilityDefinition]) -> str:
    """Render the lightweight capability catalog for the classifier prompt."""

    if not capabilities:
        return "- No tools or service capabilities are currently available."

    lines = []
    for capability in capabilities:
        lines.append(
            f"- {capability.capability_id}: {capability.description} (name: {capability.name})"
        )
    return "\n".join(lines)


def _find_last_human_text(messages: Sequence[BaseMessage]) -> str:
    """Return the latest human message content from the current thread."""

    for message in reversed(messages):
        if isinstance(message, HumanMessage):
            return str(message.content)
    return ""


def _guess_capability_ids(
    text: str,
    capabilities: Sequence[CapabilityDefinition],
) -> list[str]:
    """Fallback keyword matching used only if structured routing fails."""

    lowered = text.lower()
    matches: list[str] = []

    keyword_map = {
        "tool:read_workspace_file": [
            "read file",
            "open file",
            "show file",
            ".md",
            ".py",
            ".ts",
        ],
        "tool:search_workspace_files": [
            "find file",
            "search file",
            "locate file",
            "file path",
            "which file",
        ],
        "tool:grep_workspace_code": [
            "grep",
            "search code",
            "find in code",
            "where is",
            "find where",
            "implemented",
            "codebase",
            "repository",
            "workspace",
            "websocket",
            "conversation history",
            "chat history",
            "reference",
        ],
        "service:gmail": ["mail", "email", "gmail", "inbox", "draft", "attachment"],
        "service:googlecalendar": ["calendar", "event", "schedule"],
        "service:notion": ["notion", "database", "page"],
        "service:slack": ["slack", "channel", "workspace message"],
        "service:discord": ["discord"],
        "service:zoom": ["zoom"],
        "service:googledrive": ["drive", "folder", "upload", "save in drive"],
        "service:googlemeet": ["meet", "google meet"],
        "service:googledocs": ["docs", "document", "google doc"],
    }

    available_ids = {capability.capability_id for capability in capabilities}
    for capability_id, keywords in keyword_map.items():
        if capability_id not in available_ids:
            continue
        if any(keyword in lowered for keyword in keywords):
            matches.append(capability_id)

    return matches[:4]


def _fallback_route_decision(
    messages: Sequence[BaseMessage],
    capabilities: Sequence[CapabilityDefinition],
) -> RouteDecision:
    """Heuristic fallback if structured classification fails."""

    latest_text = _find_last_human_text(messages)
    selected_ids = _guess_capability_ids(latest_text, capabilities)
    direct_markers = ["hello", "hi", "thanks", "explain", "why", "how", "what is"]
    needs_tools = bool(selected_ids)

    if not needs_tools:
        lowered = latest_text.lower().strip()
        if any(lowered.startswith(marker) for marker in direct_markers):
            return RouteDecision(
                route="direct",
                task_summary=latest_text or "Respond directly to the user.",
                selected_capability_ids=[],
                max_tool_rounds=1,
            )

    return RouteDecision(
        route="tools" if needs_tools else "direct",
        task_summary=latest_text or "Respond directly to the user.",
        selected_capability_ids=selected_ids,
        max_tool_rounds=3 if needs_tools else 1,
    )


def _normalize_route_decision(
    decision: RouteDecision,
    capabilities: Sequence[CapabilityDefinition],
    messages: Sequence[BaseMessage],
) -> RouteDecision:
    """Clamp classifier output to the capabilities that actually exist."""

    available_ids = {capability.capability_id for capability in capabilities}
    selected_ids = [
        capability_id
        for capability_id in decision.selected_capability_ids
        if capability_id in available_ids
    ]

    guessed_ids = _guess_capability_ids(_find_last_human_text(messages), capabilities)

    if decision.route == "direct" and guessed_ids:
        return RouteDecision(
            route="tools",
            task_summary=decision.task_summary,
            selected_capability_ids=guessed_ids,
            max_tool_rounds=3,
        )

    if decision.route == "tools" and not selected_ids:
        if guessed_ids:
            return RouteDecision(
                route="tools",
                task_summary=decision.task_summary,
                selected_capability_ids=guessed_ids,
                max_tool_rounds=decision.max_tool_rounds,
            )

        return RouteDecision(
            route="direct",
            task_summary=decision.task_summary,
            selected_capability_ids=[],
            max_tool_rounds=1,
        )

    return RouteDecision(
        route=decision.route,
        task_summary=decision.task_summary,
        selected_capability_ids=selected_ids,
        max_tool_rounds=decision.max_tool_rounds if decision.route == "tools" else 1,
    )


def _serialize_tool_args(tool_args: dict) -> str:
    """Create a stable signature for a tool call."""

    return json.dumps(tool_args, sort_keys=True, default=str)


def _build_tool_registry(tools: Sequence[BaseTool]) -> dict[str, BaseTool]:
    """Index tools by name for fast execution lookup."""

    return {tool.name: tool for tool in tools}


_CONFIRMATION_TOOL_MARKERS = (
    "send",
    "message",
    "email",
    "post",
    "whatsapp",
    "notion_create",
    "create_notion",
    "discord",
    "slack",
)
_DRAFT_ARG_KEYS = ("body", "message", "content", "text", "note")


def _requires_user_confirmation(tool_name: str, tool_args: dict) -> bool:
    """Return True when the tool call appears to send/post user-visible content."""

    lowered = tool_name.lower()
    if not any(marker in lowered for marker in _CONFIRMATION_TOOL_MARKERS):
        return False
    return _find_draft_field(tool_args) is not None


def _find_draft_field(tool_args: dict) -> str | None:
    """Best-effort detection of the argument key containing draft text."""

    for key in _DRAFT_ARG_KEYS:
        value = tool_args.get(key)
        if isinstance(value, str) and value.strip():
            return key
    return None


async def _invoke_text_response(
    *,
    prompt: str,
    messages: Sequence[BaseMessage],
) -> AIMessage:
    """Invoke a no-tool node and return plain text with defensive fallbacks."""

    text_prompt = (
        f"{prompt}\n\n"
        "Return plain text only. Do not return JSON. Do not call tools."
    )

    try:
        result = await _make_llm().ainvoke(_prepend_system(text_prompt, messages))
        content = str(result.content).strip()
        if content:
            return AIMessage(content=content)
    except (BadRequestError, ValidationError, ValueError) as exc:
        logger.warning("text_response_fallback_used", error=str(exc))
    except Exception:  # noqa: BLE001
        logger.exception("text_response_failed")

    fallback_tool_message = next(
        (
            str(message.content)
            for message in reversed(messages)
            if isinstance(message, ToolMessage)
        ),
        None,
    )
    if fallback_tool_message:
        return AIMessage(content=fallback_tool_message[:2_000])
    fallback_ai_message = next(
        (
            str(message.content)
            for message in reversed(messages)
            if isinstance(message, AIMessage) and str(message.content).strip()
        ),
        None,
    )
    if fallback_ai_message:
        return AIMessage(content=fallback_ai_message[:2_000])
    return AIMessage(
        content=(
            "I couldn't finalize this response because the model attempted a tool call "
            "during no-tool formatting. Please retry this request."
        )
    )


async def classify_intent(state: AgentState) -> dict[str, object]:
    """Classify the current turn before any tool schema is bound."""

    pending_confirmation = state.get("pending_confirmation")
    if pending_confirmation:
        return {
            "route": "direct",
            "task_summary": "A pending message draft is waiting for user confirmation.",
            "selected_capability_ids": [],
            "executed_tool_signatures": [],
            "tool_round_count": 0,
            "max_tool_rounds": 1,
            "loop_detected": False,
            "tool_results": state.get("tool_results", []),
            "pending_confirmation": pending_confirmation,
        }

    user_id = state.get("user_id", "anonymous")
    messages = _recent_messages(state["messages"], max_messages=8, max_tool_messages=2)
    capabilities = await get_available_capabilities(user_id)
    prompt = (
        CLASSIFIER_PROMPT.format(capabilities=_format_capabilities(capabilities))
        + "\n\nReturn strict JSON with keys: "
        + (
            '{"route":"direct|tools","task_summary":"...",'
            '"selected_capability_ids":[],"max_tool_rounds":1}'
        )
    )

    try:
        raw_decision = await _make_llm().with_structured_output(
            RouteDecision,
            method="json_mode",
        ).ainvoke(
            _prepend_system(prompt, messages)
        )
        decision = _normalize_route_decision(raw_decision, capabilities, messages)
    except (BadRequestError, ValidationError, ValueError) as exc:
        logger.warning("classifier_fallback_used", user_id=user_id, error=str(exc))
        decision = _fallback_route_decision(messages, capabilities)
    except Exception:  # noqa: BLE001
        logger.exception("classifier_failed", user_id=user_id)
        decision = _fallback_route_decision(messages, capabilities)

    logger.info(
        "turn_classified",
        user_id=user_id,
        route=decision.route,
        selected_capability_ids=decision.selected_capability_ids,
    )
    return {
        "route": decision.route,
        "task_summary": decision.task_summary,
        "selected_capability_ids": decision.selected_capability_ids,
        "executed_tool_signatures": [],
        "tool_round_count": 0,
        "max_tool_rounds": decision.max_tool_rounds,
        "loop_detected": False,
        "tool_results": [],
        "pending_confirmation": None,
    }


async def direct_responder(state: AgentState) -> dict[str, object]:
    """Answer a turn that does not require tool access."""

    prompt = DIRECT_RESPONSE_PROMPT.format(
        task_summary=state.get("task_summary", "Respond directly to the user.")
    )
    messages = _recent_messages(state["messages"], max_messages=10, max_tool_messages=2)
    response = await _invoke_text_response(prompt=prompt, messages=messages)
    return {"messages": [response]}


async def tool_reasoner(state: AgentState) -> dict[str, object]:
    """Reason over a narrowed tool set and decide whether more tools are needed."""

    user_id = state.get("user_id", "anonymous")
    selected_capability_ids = state.get("selected_capability_ids", [])
    selected_tools = list(await get_tools_for_capabilities(user_id, selected_capability_ids))

    if not selected_tools:
        logger.warning(
            "no_tools_loaded_for_selected_capabilities",
            user_id=user_id,
            selected_capability_ids=selected_capability_ids,
        )
        return {
            "messages": [
                AIMessage(
                    content=(
                        "I couldn't load the tools needed for this request. "
                        "Please check your connected services and try again."
                    )
                )
            ]
        }

    prompt = TOOL_REASONER_PROMPT.format(
        task_summary=state.get("task_summary", "Complete the user's request."),
        selected_capabilities=", ".join(selected_capability_ids) or "none",
        tool_round_count=state.get("tool_round_count", 0),
        max_tool_rounds=state.get("max_tool_rounds", 3),
    )
    messages = _recent_messages(state["messages"], max_messages=12, max_tool_messages=5)
    force_tool_call = state.get("tool_round_count", 0) == 0
    llm = _make_llm().bind_tools(
        selected_tools,
        tool_choice="required" if force_tool_call else "auto",
    )

    try:
        response = await llm.ainvoke(_prepend_system(prompt, messages))
    except BadRequestError as exc:
        if "tool_use_failed" in str(exc):
            logger.warning("tool_reasoner_fallback", user_id=user_id, error=str(exc))
            response = AIMessage(
                content=(
                    "I couldn't complete this tool step due to a model/tool-call formatting issue. "
                    "Please retry the request."
                )
            )
        else:
            raise

    logger.info(
        "tool_reasoner_response",
        user_id=user_id,
        has_tool_calls=bool(getattr(response, "tool_calls", None)),
    )
    return {"messages": [response]}


async def tool_executor(state: AgentState) -> dict[str, object]:
    """Execute all tool calls present in the last AIMessage."""

    user_id = state.get("user_id", "anonymous")
    last = state["messages"][-1]
    tool_calls = getattr(last, "tool_calls", []) or []

    if not tool_calls:
        return {}

    selected_tools = await get_tools_for_capabilities(
        user_id,
        state.get("selected_capability_ids", []),
    )
    registry = _build_tool_registry(selected_tools)
    tool_messages: list[ToolMessage] = []
    executed_signatures = list(state.get("executed_tool_signatures", []))
    existing_results = list(state.get("tool_results", []))
    new_results = []
    pending_confirmation = None
    loop_detected = False
    round_had_success = False

    for index, call in enumerate(tool_calls):
        tool_name = call.get("name", "")
        tool_args: dict = call.get("args", {})
        call_id = call.get("id", f"call_{index}")
        tool_args_json = _serialize_tool_args(tool_args)
        signature = f"{tool_name}:{tool_args_json}"

        if not tool_name:
            content = "Tool call was missing a tool name, so it was skipped."
            status = "error"
            loop_detected = True
            logger.warning("tool_call_missing_name", user_id=user_id)
        elif signature in executed_signatures:
            content = (
                f"Skipped duplicate call to '{tool_name}' with the same arguments. "
                "Use the earlier tool result already present in the conversation."
            )
            status = "duplicate"
            loop_detected = True
            logger.warning("duplicate_tool_call_blocked", tool=tool_name, user_id=user_id)
        else:
            executed_signatures.append(signature)
            tool = registry.get(tool_name)
            if tool is None:
                content = f"Tool '{tool_name}' is not available for this turn."
                status = "missing"
                logger.warning("tool_not_found", tool=tool_name, user_id=user_id)
            else:
                draft_field = _find_draft_field(tool_args)
                if _requires_user_confirmation(tool_name, tool_args) and draft_field:
                    status = "pending_confirmation"
                    content = (
                        f"Pending confirmation for '{tool_name}'. "
                        "Awaiting explicit user approval before execution."
                    )
                    pending_confirmation = {
                        "tool_name": tool_name,
                        "tool_call_id": call_id,
                        "arguments_json": tool_args_json,
                        "draft_field": draft_field,
                        "draft_text": str(tool_args.get(draft_field, "")),
                        "selected_capability_ids": list(state.get("selected_capability_ids", [])),
                    }
                    loop_detected = True
                    logger.info("tool_call_requires_confirmation", tool=tool_name, user_id=user_id)
                else:
                    try:
                        content = str(await tool.ainvoke(tool_args))
                        status = "success"
                        round_had_success = True
                        logger.info("tool_executed", tool=tool_name, user_id=user_id)
                    except Exception as exc:  # noqa: BLE001
                        content = f"Tool '{tool_name}' failed: {exc}"
                        status = "error"
                        logger.exception("tool_execution_failed", tool=tool_name, user_id=user_id)

        tool_messages.append(ToolMessage(content=content[:10_000], tool_call_id=call_id))
        new_results.append(
            {
                "tool_name": tool_name or "unknown",
                "arguments_json": tool_args_json,
                "status": status,
                "content": content[:4_000],
            }
        )

    return {
        "messages": tool_messages,
        "executed_tool_signatures": executed_signatures,
        "tool_round_count": state.get("tool_round_count", 0) + 1,
        "loop_detected": loop_detected and not round_had_success,
        "tool_results": [*existing_results, *new_results],
        "pending_confirmation": pending_confirmation,
    }


async def synthesize_response(state: AgentState) -> dict[str, object]:
    """Generate the final user-facing answer after the tool path."""

    pending_confirmation = state.get("pending_confirmation")
    if pending_confirmation:
        tool_name = pending_confirmation.get("tool_name", "this action")
        draft_text = pending_confirmation.get("draft_text", "")
        response = (
            f"I prepared a draft for `{tool_name}` but have not sent it yet.\n\n"
            f"Draft:\n{draft_text}\n\n"
            "Reply with one of the following:\n"
            "1. `confirm` to send now\n"
            "2. `cancel` to stop\n"
            "3. An edit instruction (example: remove paragraph 1, set name to Gagan Gupta)"
        )
        return {"messages": [AIMessage(content=response)], "loop_detected": False}

    last_message = state["messages"][-1]
    if (
        isinstance(last_message, AIMessage)
        and not getattr(last_message, "tool_calls", None)
        and state.get("tool_round_count", 0) == 0
    ):
        content = str(last_message.content).strip()
        if content:
            return {"messages": [AIMessage(content=content)], "loop_detected": False}

    prompt = SYNTHESIS_PROMPT.format(
        task_summary=state.get("task_summary", "Complete the user's request."),
        tool_round_count=state.get("tool_round_count", 0),
        max_tool_rounds=state.get("max_tool_rounds", 3),
        loop_detected=str(state.get("loop_detected", False)).lower(),
    )
    messages = _recent_messages(state["messages"], max_messages=14, max_tool_messages=6)
    response = await _invoke_text_response(prompt=prompt, messages=messages)
    return {"messages": [response], "loop_detected": False}


def route_after_classification(state: AgentState) -> str:
    """Route to either the direct responder or the tool path."""

    return state.get("route", "direct")


def should_use_tool(state: AgentState) -> str:
    """Return 'tool' if the last reasoning step proposed tool calls."""

    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):
        return "tool"
    return "respond"


def should_continue_after_tools(state: AgentState) -> str:
    """Stop on loops or budget exhaustion; otherwise allow another tool round."""

    if state.get("loop_detected", False):
        return "respond"
    if state.get("tool_round_count", 0) >= state.get("max_tool_rounds", 3):
        return "respond"
    return "tool"
