"""Mindmap Conversion Agent."""

import logging

from agents import ModelSettings
from topix.agents.base import BaseAgent
from topix.agents.datatypes.inputs import MindMapConversionInput
from topix.agents.mindmap.datatypes import SimpleNode

logger = logging.getLogger(__name__)


class MindmapConversion(BaseAgent[SimpleNode]):
    """Mindmap Conversion Agent."""

    def __init__(
        self,
        model: str = "gpt-4o-mini",
        instructions_template: str = "mindmap_conversion.system.jinja",
        model_settings: ModelSettings | None = None,
    ):
        name = "Mindmap Conversion"
        instructions = self._render_prompt(instructions_template)
        if model_settings is None:
            model_settings = ModelSettings(temperature=0.1)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            output_type=SimpleNode,
        )
        super().__post_init__()

    async def _input_formatter(self, context, input: MindMapConversionInput):
        answer = input.answer
        key_points = input.key_points
        return self._render_prompt(
            self.prompts["user"], answer=answer, key_points=key_points
        )
