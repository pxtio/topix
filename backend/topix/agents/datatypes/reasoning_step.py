"""Reasoning text step datatype."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from topix.utils.common import gen_uid


class ReasoningStep(BaseModel):
    """Persisted text emitted between tool calls in a single agent run."""

    type: Literal["reasoning_step"] = "reasoning_step"
    id: str = Field(default_factory=gen_uid)
    reasoning: str = ""
    message: str = ""

    def to_compact_step_description(self) -> str:
        """Convert to a compact text representation for retrieval or previews."""
        chunks = [part.strip() for part in [self.reasoning, self.message] if part.strip()]
        return " / ".join(chunks)
