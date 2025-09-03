"""Reasoning-related data types."""

from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel

from topix.agents.datatypes.outputs import ToolOutput
from topix.agents.datatypes.tools import AgentToolName


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
    thought: str | None = None
    output: ToolOutput
    event_messages: list[str] = []
    state: ToolCallState = ToolCallState.STARTED
    arguments: dict[str, Any] = {}
