"""Agent context datatypes."""
import asyncio

from pydantic import BaseModel, PrivateAttr
from qdrant_client.http.models import Filter, FieldCondition, MatchValue

from topix.agents.datatypes.stream import AgentStreamMessage
from topix.agents.datatypes.tool_call import ToolCall


class Context(BaseModel):
    """Base class for agent context."""

    _message_queue: asyncio.Queue[AgentStreamMessage | ToolCall] = PrivateAttr(default_factory=asyncio.Queue)
    tool_calls: list[ToolCall] = []


class ReasoningContext(Context):
    """Agent context for managing state and results."""

    memory_search_limit: int = 8
    memory_search_filter: Filter | None = None
    # Cache searched memories to prevent from duplication
    _memory_cache: set[str] = set()

    chat_history: list[dict[str, str]] = []

    search_ressource_types: list[str] = ["note", "message", "newsfeed", "chunk"]
    search_ressource_bonus_types: list[str] = ["chunk"]

    def create_memory_search_filter(self, search_ressource_type: list[str], search_ressource_bonus_types: list[str]) -> Filter:
        """Create a memory search filter."""
        self.memory_search_filter = Filter(
            must=[
                FieldCondition(
                    key="type",
                    match=MatchValue(value=search_ressource_type)
                )
            ],
            should=[
                FieldCondition(
                    key="type",
                    match=MatchValue(value=search_ressource_bonus_types)
                )
            ]
        )
        return self.memory_search_filter
