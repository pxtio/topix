"""Agent to describe a chat."""
import logging

from pydantic import BaseModel

from agents import Agent, ModelSettings, Runner
from topix.agents.base import BaseAgentManager
from topix.agents.prompt_utils import render_prompt

logger = logging.getLogger(__name__)


class ChatDescription(BaseModel):
    """Model to represent the chat description."""

    title: str


class DescribeChat(BaseAgentManager):
    """Agent to describe a chat."""

    name = "Describe Chat"
    model_name = "gpt-4.1-nano"
    prompts = "describe_chat.jinja"

    def __init__(self):
        """Init method."""
        self.agent = Agent(
            name=self.name,
            instructions=render_prompt(self.prompts),
            model=self.model_name,
            output_type=ChatDescription,
            model_settings=ModelSettings(temperature=0.5)
        )

    async def run(self, messages: list[dict]) -> str | None:
        """Run the agent with the provided messages."""
        try:
            result = await Runner.run(
                starting_agent=self.agent,
                input=messages,
                max_turns=1
            )
            return result.final_output.title if result.final_output else None
        except Exception as e:
            logger.warning(
                "Error running Describe Chat agent: %s",
                str(e),
                exc_info=True
            )
            return None
