"""Base class for agent managers in the Topix application."""

import abc

from typing import AsyncGenerator, TypeVar

from openai.types.responses import ResponseTextDeltaEvent
from pydantic import BaseModel

from agents import RunContextWrapper, RunResultStreaming
from topix.agents.datatypes.stream import AgentStreamMessage, StreamDelta, StreamMessageType

T = TypeVar("T", bound=BaseModel)


RAW_RESPONSE_EVENT = "raw_response_event"


class BaseAgentManager(abc.ABC):
    """Base class for agent managers."""

    def __init_subclass__(cls):
        """Ensure that subclasses define the required attributes."""
        super().__init_subclass__()
        # Only check concrete subclasses
        if not getattr(cls, '__abstractmethods__', set()):
            if not hasattr(cls, "name") or not hasattr(cls, "model_name"):
                raise TypeError(
                    f"{cls.__name__} must define class attributes 'name' and 'model_name'"
                )

    @abc.abstractmethod
    async def run(self, context: T, query: str) -> str | BaseModel:
        """Run the agent with the given context and input."""
        raise NotImplementedError("Subclasses must implement this method.")

    async def handle_stream_events(
        self,
        stream_response: RunResultStreaming,
        **fixed_params
    ) -> AsyncGenerator[AgentStreamMessage, None]:
        """Handle streaming events from the agent."""
        async for event in stream_response.stream_events():
            if event.type == RAW_RESPONSE_EVENT and \
                    isinstance(event.data, ResponseTextDeltaEvent):
                yield AgentStreamMessage(
                    type=StreamMessageType.TOKEN,
                    delta=StreamDelta(
                        content=event.data.delta
                    ),
                    **fixed_params
                )


class BaseToolAgentManager(BaseAgentManager):
    """Base class for tool agent managers."""

    name = "Base Tool Agent Manager"
    model_name = "gpt-4o-mini"

    @abc.abstractmethod
    async def as_tool(self, wrapper: RunContextWrapper[T], query: str) -> str:
        """Run the agent as a tool with the given wrapper and query."""
        raise NotImplementedError("Subclasses must implement this method.")
