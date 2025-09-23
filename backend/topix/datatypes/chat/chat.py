"""Chat datatypes."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field

from topix.datatypes.property import DataProperty, ReasoningProperty
from topix.datatypes.resource import Resource, ResourceProperties
from topix.utils.common import gen_uid


class MessageRole(StrEnum):
    """Enum for message roles."""

    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class MessageProperties(ResourceProperties):
    """Message properties."""

    __pydantic_extra__: dict[str, DataProperty] = Field(init=False)

    reasoning: ReasoningProperty = Field(
        default_factory=lambda: ReasoningProperty()
    )


class Message(Resource):
    """Message in a chat."""

    type: Literal["message"] = "message"

    chat_uid: str | None = None

    role: MessageRole

    properties: MessageProperties = Field(
        default_factory=MessageProperties
    )

    def to_chat_message(self) -> dict[str, str]:
        """Convert to a chat message format."""
        content = ""
        if self.content:
            if isinstance(self.content, dict):
                content = self.content.get("markdown", "")
            else:
                content = self.content.markdown if self.content else ""
        return {
            "role": self.role,
            "content": content
        }


class Chat(BaseModel):
    """Chat object representing a conversation."""

    id: int | None = None
    uid: str = Field(default_factory=gen_uid)
    type: Literal["chat"] = "chat"
    label: str | None = None

    user_uid: str
    graph_uid: str | None = None

    created_at: str | None = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str | None = None
    deleted_at: str | None = None
