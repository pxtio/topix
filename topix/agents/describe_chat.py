"""Agent to describe a chat."""
import logging

from pydantic import BaseModel

from agents import ModelSettings
from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context

logger = logging.getLogger(__name__)


class ChatDescription(BaseModel):
    """Model to represent the chat description."""

    title: str


class DescribeChat(BaseAgent):
    """Agent to describe a chat."""

    def __init__(
        self,
        model: str = "openai/gpt-4.1-nano",
        instructions_template: str = "describe_chat.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Init method."""
        name = "Describe Chat"
        instructions = self._render_prompt(instructions_template)

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.5)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            output_type=ChatDescription,
            instructions=instructions,
        )

    async def _output_extractor(self, context: Context, output: ChatDescription):
        return output.final_output.title if output.final_output else None
