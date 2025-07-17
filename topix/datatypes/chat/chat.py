"""Chat datatypes."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from topix.datatypes.enum import CustomEnum
from topix.utils.common import gen_uid


class MessageRole(str, CustomEnum):
    """Enum for message roles."""

    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class Message(BaseModel):
    """Message in a chat."""

    type: Literal["message"] = "message"
    id: str = Field(default_factory=gen_uid)
    chat_uid: str
    role: MessageRole
    content: str | dict | list

    created_at: str | None = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str | None = None
    deleted_at: str | None = None

    def to_chat_message(self) -> dict:
        return {
            "role": self.role,
            "content": self.content
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
