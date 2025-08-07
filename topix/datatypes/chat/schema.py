"""Code Interpreter Output Data Types."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class TextMessageContent(BaseModel):
    """Text message content."""

    type: Literal['text'] = 'text'
    text: str


class ImageUrl(BaseModel):
    """Image URL."""

    url: str
    detail: Literal['low', 'high'] = 'low'


class ImageMessageContent(BaseModel):
    """Image message content."""

    type: Literal['image_url'] = 'image_url'
    image_url: ImageUrl


class ChatMessage(BaseModel):
    """Message model for an LLM chat model."""

    role: Literal['user', 'assistant', 'system'] = 'user'
    content: str | list[TextMessageContent | ImageMessageContent]

    @classmethod
    def from_str(cls, content: str) -> 'ChatMessage':
        """Create a ChatMessage from a string."""
        return cls(content=content)
