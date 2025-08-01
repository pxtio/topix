"""Key Points Extraction Agent for Mindmap Generation."""

import logging

from agents import ModelSettings
from topix.agents.base import BaseAgent
from topix.agents.datatypes.model_enum import ModelEnum

logger = logging.getLogger(__name__)


class KeyPointsExtract(BaseAgent):
    """Key Points Extraction Agent."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1_MINI,
        instructions_template: str = "answer_reformulation.system.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Init method."""
        name = "Key Points Extraction"
        instructions = self._render_prompt(instructions_template)
        if model_settings is None:
            model_settings = ModelSettings(temperature=0.1)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
        )
        super().__post_init__()
