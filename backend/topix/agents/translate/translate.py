"""Translate text into a target language."""
from __future__ import annotations

from agents import ModelSettings

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.outputs import TranslateOutput


class TranslateAgent(BaseAgent):
    """Translate Agent for converting text into a target language."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_5_1,
        instructions_template: str = "translate/translate.system.jinja",
        model_settings: ModelSettings | None = None,
        target_language: str = "English",
    ):
        """Init method."""
        name = "Translate"
        instructions = self._render_prompt(
            instructions_template,
            target_language=target_language,
        )
        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        self.target_language = target_language

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            output_type=TranslateOutput,
        )
        super().__post_init__()

    async def _input_formatter(
        self, context: Context, input: str
    ) -> str:
        """Format the input for the translate agent."""
        user_prompt = self._render_prompt(
            "translate/translate.user.jinja",
            input_text=input,
            target_language=self.target_language,
        )
        return user_prompt
