"""Image Description Agent to describe images given their URLs."""
from __future__ import annotations

import asyncio
import logging

from typing import Literal

from agents import ModelSettings
from pydantic import BaseModel

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.outputs import ImageDescriptionOutput
from topix.agents.run import AgentRunner


class ImageMessageContent(BaseModel):
    """Content model for image messages.

    TODO: Merge with Message class in agents.datatypes.message
    """

    type: Literal['input_image'] = 'input_image'
    image_url: str


class ImageDescriptionInput(BaseModel):
    """Message model for the image description agent."""

    role: Literal['user', 'assistant', 'system'] = 'user'
    content: list[ImageMessageContent]

    @classmethod
    def from_url(cls, image_url: str) -> ImageDescriptionInput:
        """Create an ImageDescriptionInput from an image URL."""
        return cls(content=[ImageMessageContent(image_url=image_url)])


class ImageDescriptionAgent(BaseAgent):
    """Agent to describe images given their URLs."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O_MINI,
        instructions_template: str = "image/image_description.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Initialize the Image Description agent."""
        name = "Image Description"
        instructions = self._render_prompt(instructions_template)
        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            output_type=ImageDescriptionOutput,
        )

        super().__post_init__()


async def describe_images(
    image_urls: list[str],
) -> list[ImageDescriptionOutput | None]:
    """Compute a description of each image.

    Args:
        image_urls: list of image urls.

    Returns:
        list of image descriptions.

    """
    description_inputs = [
        [ImageDescriptionInput.from_url(image_url)]
        for image_url in image_urls
    ]

    async def run_description(
        input: list[ImageDescriptionInput]
    ) -> ImageDescriptionOutput | None:
        """Wrap the execution of the description agent for a single image input."""
        try:
            description = await AgentRunner.run(ImageDescriptionAgent(), input=input, context=Context())
            return description
        except Exception as e:
            logging.warning(f"Error while trying to describe image: {e}", exc_info=True)
            return None

    description_tasks = [run_description(input) for input in description_inputs]
    descriptions = await asyncio.gather(*description_tasks)
    return descriptions
