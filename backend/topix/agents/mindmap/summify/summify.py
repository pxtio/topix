"""Convert a text/conversation to a summarized schema."""
from __future__ import annotations

from agents import ModelSettings

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.mindmap.schemify.datatypes import SchemaOutput


class SummifyAgent(BaseAgent):
    """Summify Agent for summarizing text into a schema."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_5_1,
        instructions_template: str = "summify/summify.system.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Init method."""
        name = "Summify"
        instructions = self._render_prompt(instructions_template)
        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            output_type=SchemaOutput,
        )
        super().__post_init__()

    async def _input_formatter(
        self, context: Context, input: str
    ) -> str:
        """Format the input for the summify agent."""
        user_prompt = self._render_prompt(
            "summify/summify.user.jinja",
            input_text=input,
        )
        return user_prompt
