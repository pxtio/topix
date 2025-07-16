"""Base class for agent managers in the Topix application."""

import abc

from typing import TypeVar

from pydantic import BaseModel

from agents import RunContextWrapper

T = TypeVar("T", bound=BaseModel)


class BaseAgentManager(abc.ABC):
    """Base class for agent managers."""

    def __init_subclass__(cls):
        """Ensure that subclasses define the required attributes."""
        if not hasattr(cls, "name") or not hasattr(cls, "model_name"):
            raise TypeError(
                f"{cls.__name__} must define class attributes 'name' and 'model_name'"
            )

    @abc.abstractmethod
    async def run(self, context: T, query: str) -> str | BaseModel:
        """Run the agent with the given context and input."""
        raise NotImplementedError("Subclasses must implement this method.")

    @abc.abstractmethod
    async def as_tool(self, wrapper: RunContextWrapper[T], query: str) -> str:
        """Run the agent as a tool with the given wrapper and query."""
        raise NotImplementedError("Subclasses must implement this method.")
