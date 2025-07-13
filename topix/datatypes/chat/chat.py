"""Chat datatypes."""

from datetime import datetime
import json
from typing import Literal

from pydantic import BaseModel, Field

from topix.utils.common import gen_uid


class Message(BaseModel):
    type: Literal["message"] = "message"
    id: str = Field(default_factory=lambda: f"message_{gen_uid()}")
    chat_uid: str
    role: Literal["system", "user", "assistant", "tool"]
    content: str | dict

    created_at: str | None = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str | None = None
    deleted_at: str | None = None

    def to_chat_message(self) -> dict:
        return {
            "role": self.role,
            "content": self.content if isinstance(self.content, str)
            else json.dumps(self.content),
        }


class Chat(BaseModel):
    """Chat object representing a conversation."""

    id: int | None = None
    uid: str = Field(default_factory=lambda: f"chat_{gen_uid()}")
    type: Literal["chat"] = "chat"
    label: str | None = None

    user_uid: str

    created_at: str | None = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str | None = None
    deleted_at: str | None = None
