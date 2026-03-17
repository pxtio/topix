"""Chat datatypes."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field

from topix.datatypes.property import DataProperty, ReasoningProperty, TextProperty
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
    context: TextProperty = Field(
        default_factory=lambda: TextProperty()
    )


class Message(Resource):
    """Message in a chat."""

    type: Literal["message"] = "message"

    chat_uid: str | None = None

    role: MessageRole

    properties: MessageProperties = Field(
        default_factory=MessageProperties
    )

    def _compact_reasoning(self) -> str:
        """Compact reasoning into a short string for display."""
        steps = self.properties.reasoning.reasoning
        if not steps:
            return ""

        steps_str = " -> ".join(
            step.to_compact_step_description()
            for step in steps
            if step.to_compact_step_description()
        )

        return f"<Reasoning>\n\n{steps_str}\n\n</Reasoning>\n\n" if steps_str else ""

    def to_chat_message(self) -> dict[str, str]:
        """Convert to a chat message format."""
        content = ""
        reasoning = self._compact_reasoning()
        if self.content:
            if isinstance(self.content, dict):
                content = self.content.get("markdown", "")
            else:
                content = self.content.markdown if self.content else ""

        content = f"{reasoning}{content}" if reasoning else content

        # If there is message-level context, prepend it to the content in a special format
        if self.role == MessageRole.USER and self.properties.context.text:
            content = (
                f"<MessageContext>\n\n{self.properties.context.text}\n\n</MessageContext>\n\n{content}"
            )
        return {
            "role": self.role,
            "content": content
        }

    def to_embeddable(self) -> list[str]:
        """Convert the message to a string that can be embedded in a vector database."""
        content = self.content.markdown if self.content else ""
        reasoning = self._compact_reasoning()
        return [f"{reasoning}\n\n{content}".strip() if reasoning else content.strip()]


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
