"""Reasoning-related data types."""

from typing import Any, Literal

from pydantic import BaseModel

from src.agents.datatypes.outputs import ToolOutput
from src.agents.datatypes.tools import AgentToolName
from src.datatypes.enum import CustomEnum


class ToolCallState(str, CustomEnum):
    """Enum for reasoning step states."""

    STARTED = "started"
    COMPLETED = "completed"
    FAILED = "failed"


class KnowledgeSource(BaseModel):
    """Knowledge source for reasoning steps."""

    class Webpage(BaseModel):
        """Webpage source."""

        url: str
        site_name: str | None = None
        title: str | None = None
        description: str | None = None
        favicon: str | None = None

    type: Literal["webpage"] = "webpage"
    webpage: Webpage


class ToolCall(BaseModel):
    """A single step in the reasoning process."""

    type: Literal["tool_call"] = "tool_call"
    id: str
    name: AgentToolName
    output: ToolOutput
    event_messages: list[str] = []
    state: ToolCallState = ToolCallState.STARTED
    arguments: dict[str, Any] = {}
