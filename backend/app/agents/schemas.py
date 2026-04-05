"""Structured output schemas for the agent orchestration layer."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class RouteDecision(BaseModel):
    """Classifier output used to gate tool access for a single turn."""

    route: Literal["direct", "tools"] = Field(
        description="Whether the current turn should answer directly or use tools."
    )
    task_summary: str = Field(
        min_length=1,
        description="Short summary of the user's goal using the same-thread context.",
    )
    selected_capability_ids: list[str] = Field(
        default_factory=list,
        description="Smallest set of capability IDs required for this turn.",
    )
    max_tool_rounds: int = Field(
        default=3,
        ge=1,
        le=4,
        description="Maximum tool reasoning rounds allowed for this turn.",
    )


class TextResponse(BaseModel):
    """Structured plain-text response for no-tool nodes."""

    response: str = Field(min_length=1, description="Final user-facing response text.")
