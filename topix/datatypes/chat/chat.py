from datetime import datetime
import json
from typing import Literal

from pydantic import BaseModel, Field

from topix.utils.common import gen_uid


class Message(BaseModel):
    type: Literal["message"] = "message"
    id: str = Field(default_factory=lambda: f"message_{gen_uid()}")
    chat_id: str
    role: Literal["system", "user", "assistant", "tool"]
    content: str | dict

    sent_at: datetime = Field(default_factory=datetime.now)
    deleted_at: datetime | None = None

    def to_chat_message(self) -> dict:
        return {
            "role": self.role,
            "content": self.content if isinstance(self.content, str) else json.dumps(self.content),
        }


class Chat(BaseModel):
    id: str = Field(default_factory=lambda: f"chat_{gen_uid()}")
    type: Literal["chat"] = "chat"
    label: str | None = None

    user_id: str | None = None

    created_at: datetime = Field(default_factory=datetime.now)
    deleted_at: datetime | None = None
