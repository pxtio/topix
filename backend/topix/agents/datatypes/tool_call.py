"""Reasoning-related data types."""

from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel

from topix.agents.datatypes.outputs import ToolOutput
from topix.agents.datatypes.tools import AgentToolName

MAX_ARGUMENTS_LENGTH = 200


class ToolCallState(StrEnum):
    """Enum for reasoning step states."""

    STARTED = "started"
    COMPLETED = "completed"
    FAILED = "failed"


class ToolCall(BaseModel):
    """A single step in the reasoning process."""

    type: Literal["tool_call"] = "tool_call"
    id: str
    name: AgentToolName
    thought: str = ""
    output: ToolOutput
    event_messages: list[str] = []
    state: ToolCallState = ToolCallState.STARTED
    arguments: dict[str, Any] = {}

    def to_compact_step_description(self) -> str:
        """Convert to a compact string representation for display."""
        args_str = ", ".join(f"{k}: '{v}'" for k, v in self.arguments.items())
        if len(args_str) > MAX_ARGUMENTS_LENGTH:
            args_str = args_str[:MAX_ARGUMENTS_LENGTH] + "..."

        return f"{self.name}({{ {args_str} }})"
