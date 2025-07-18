"""Mindmap Conversion Agent."""

import logging

from agents import Agent, ModelSettings, Runner
from topix.agents.base import BaseAgentManager
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.mindmap.datatypes import SimpleNode
from topix.agents.prompt_utils import render_prompt

logger = logging.getLogger(__name__)


class MindmapConversion(BaseAgentManager):
    """Mindmap Conversion Agent."""

    name = "Mindmap Conversion"
    model_name = "gpt-4.1-mini"
    prompts = {
        "system": "mindmap_conversion.system.jinja",
        "user": "mindmap_conversion.user.jinja"
    }

    def __init__(self):
        """Initialize the Mindmap Conversion agent."""
        self.agent = Agent[ReasoningContext](
            name=self.name,
            instructions=render_prompt(self.prompts["system"]),
            model=self.model_name,
            output_type=SimpleNode,
            model_settings=ModelSettings(temperature=0.1)
        )

    async def run(self, answer: str, key_points: str) -> SimpleNode | None:
        """Run the Mindmap Conversion agent with the provided key points."""
        try:
            result = await Runner.run(
                starting_agent=self.agent,
                input=render_prompt(self.prompts["user"], answer=answer, key_points=key_points),
                max_turns=1
            )
            return result.final_output
        except Exception as e:
            logger.warning(
                "Error running Mindmap Conversion agent: %s",
                str(e),
                exc_info=True
            )
            return None
