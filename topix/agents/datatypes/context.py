"""Agent context datatypes."""
import asyncio

from typing import Any

from pydantic import BaseModel, PrivateAttr


class ToolCall(BaseModel):
    """Tool call."""

    tool_id: str
    tool_name: str
    arguments: dict
    output: Any


class Context(BaseModel):
    """Base class for agent context."""

    _message_queue: asyncio.Queue = PrivateAttr(default_factory=asyncio.Queue)
    tool_calls: list[ToolCall] = []


class ReasoningContext(Context):
    """Agent context for managing state and results."""

    search_results_limit: int = 5

    chat_history: list[dict[str, str]] = []
