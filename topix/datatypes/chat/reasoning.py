"""Reasoning-related data types."""

from typing import Literal

from pydantic import BaseModel

from topix.agents.datatypes.tools import AgentToolName
from topix.datatypes.enum import CustomEnum


class ReasoningStepState(str, CustomEnum):
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


class ReasoningStep(BaseModel):
    """A single step in the reasoning process."""

    id: str
    name: AgentToolName
    response: str = ""
    event_messages: list[str] = []
    state: ReasoningStepState
    sources: list[KnowledgeSource] = []
