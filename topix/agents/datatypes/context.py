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

    memory_search_limit: int = 5
    memory_search_filter: dict | None = None
    # Cache searched memories to prevent from duplication
    _memory_cache: set[str] = set()

    chat_history: list[dict[str, str]] = []
