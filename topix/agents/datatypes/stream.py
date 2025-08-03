"""Agent stream datatypes for token streaming."""
from typing import Literal

from pydantic import BaseModel

from topix.agents.datatypes.tools import AgentToolName
from topix.datatypes.enum import CustomEnum


class ContentType(str, CustomEnum):
    """Agent stream content types."""

    TOKEN = "token"
    STATUS = "status"
    MESSAGE = "message"


class Content(BaseModel):
    """Agent stream content."""

    type: ContentType = ContentType.TOKEN
    text: str = ""


class AgentStreamMessage(BaseModel):
    """Agent stream message for streaming results."""

    tool_id: str
    tool_name: AgentToolName
    content: Content | None = None
    is_stop: bool | Literal["error"] | None = None
