"""Chat datatypes."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from topix.datatypes.enum import CustomEnum
from topix.datatypes.property import DataProperty, ReasoningProperty
from topix.datatypes.resource import Resource
from topix.utils.common import gen_uid


class MessageRole(str, CustomEnum):
    """Enum for message roles."""

    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class Message(Resource):
    """Message in a chat."""

    type: Literal["message"] = "message"

    chat_uid: str | None = None

    role: MessageRole

    properties: dict[str, DataProperty] = {
        "reasoning": ReasoningProperty()
    }

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
