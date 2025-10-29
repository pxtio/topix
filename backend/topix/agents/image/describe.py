import asyncio
import logging
import os
from typing import Literal

from openai import AsyncOpenAI
from pydantic import BaseModel

from topix.agents.prompt_utils import render_prompt

from backend.topix.agents.datatypes.model_enum import OpenAIModel


class TextMessageContent(BaseModel):
    type: Literal['text'] = 'text'
    text: str


class ImageUrl(BaseModel):
    url: str
    detail: Literal['low', 'high'] = 'low'


class ImageMessageContent(BaseModel):
    type: Literal['image_url'] = 'image_url'
    image_url: ImageUrl


class ChatMessage(BaseModel):
    """Message model for an LLM chat model"""
    role: Literal['user', 'assistant', 'system'] = 'user'
    content: str | list[TextMessageContent | ImageMessageContent]

    @classmethod
    def from_str(cls, content: str) -> 'ChatMessage':
        return cls(content=content)


class ImageDescription(BaseModel):
    image_title: str
    image_type: str
    image_summary: str


async def process_message(
    client: AsyncOpenAI, message: ChatMessage
) -> ImageDescription | None:
    """Process a message with the OpenAI API to get an image description."""
    try:
        response = await client.beta.chat.completions.parse(
            model=OpenAIModel.GPT_4O_MINI,
            messages=[message.model_dump()],
            response_format=ImageDescription
        )
        result = response.choices[0].message.content
        return result
    except Exception as e:
        logging.error(f"Error processing message: {e}", exc_info=True)
        return None


async def image_descriptor(image_urls: list[str]) -> list[ImageDescription | None]:
    """Compute a description of each image.

    Args:
        image_urls: list of image urls.

    Returns:
        list of image descriptions.
    """
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def input_handler(image_url: str, detail: str = 'low') -> ChatMessage:
        """ Format the input """
        text = render_prompt("image_description.jinja")
        message = ChatMessage(
            content=[
                TextMessageContent(text=text),
                ImageMessageContent(
                    image_url=ImageUrl(url=image_url, detail=detail)
                )
            ]
        )
        return message

    message_collection = [input_handler(image_url) for image_url in image_urls]
    descriptions = await asyncio.gather(
        *[process_message(client, message) for message in message_collection]
    )
    return descriptions
