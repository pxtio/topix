"""Key Points Extraction Agent for Mindmap Generation."""

import logging

from agents import Agent, ModelSettings, Runner
from topix.agents.base import BaseAgentManager
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.prompt_utils import render_prompt

logger = logging.getLogger(__name__)


class KeyPointsExtract(BaseAgentManager):
    """Key Points Extraction Agent."""

    name = "Key Points Extraction"
    model_name = "gpt-4.1-mini"
    prompts = "key_points_extraction.jinja"

    def __init__(self):
        """Initialize the Key Points Extraction agent."""
        self.agent = Agent[ReasoningContext](
            name=self.name,
            instructions=render_prompt(self.prompts),
            model=self.model_name,
            output_type=str,
            model_settings=ModelSettings(temperature=0.1)
        )

    async def run(self, answer: str) -> str:
        """Run the Key Points Extraction agent with the provided context and answer."""
        try:
            result = await Runner.run(
                starting_agent=self.agent,
                input=answer,
                max_turns=1
            )
            return result.final_output
        except Exception as e:
            logger.warning(
                "Error running Key Points Extraction agent: %s",
                str(e),
                exc_info=True
            )
            return ""
