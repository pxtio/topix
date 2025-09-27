"""Agent stream datatypes for token streaming."""
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel

from topix.agents.datatypes.annotations import Annotation
from topix.agents.datatypes.tools import AgentToolName


class ContentType(StrEnum):
    """Agent stream content types."""

    TOKEN = "token"
    STATUS = "status"
    MESSAGE = "message"
    INPUT = "input"


class Content(BaseModel):
    """Agent stream content."""

    type: ContentType = ContentType.TOKEN
    text: str = ""
    annotations: list[Annotation] = []


class StreamingMessageType(StrEnum):
    """Agent stream message types."""

    STREAM_MESSAGE = "stream_message"
    STREAM_REASONING_MESSAGE = "stream_reasoning_message"


class AgentStreamMessage(BaseModel):
    """Agent stream message for streaming results."""

    type: StreamingMessageType = StreamingMessageType.STREAM_MESSAGE
    tool_id: str
    tool_name: AgentToolName
    content: Content | None = None
    is_stop: bool | Literal["error"] | None = None
