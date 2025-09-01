"""Agent context datatypes."""
import asyncio

from pydantic import BaseModel, PrivateAttr

from topix.datatypes.chat.tool_call import ToolCall


class Context(BaseModel):
    """Base class for agent context."""

    _message_queue: asyncio.Queue = PrivateAttr(default_factory=asyncio.Queue)
    tool_calls: list[ToolCall] = []


class ReasoningContext(Context):
    """Agent context for managing state and results."""

    search_results_limit: int = 5

    chat_history: list[dict[str, str]] = []
