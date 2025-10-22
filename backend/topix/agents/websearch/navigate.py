"""Fetch website content."""
from __future__ import annotations

from datetime import datetime

from agents import function_tool
from pydantic import BaseModel, Field

from topix.agents.base import BaseAgent
from topix.agents.config import BaseAgentConfig
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.websearch.tools import fetch_content
from topix.api.utils.common import iso_to_clear_date


@function_tool
async def fetch_url_content(
    url: str
):
    """Fetch the content of a URL.

    Args:
        url: The URL to fetch.

    Returns:
        str: The content of the URL. If fetching fails, returns a message indicating the failure.

    """
    try:
        content = await fetch_content(url, extract_depth="basic")
        return content
    except Exception as e:
        return (
            f"Failed to fetch content from {url}: {e}. "
            "Whether the URL is not reachable or invalid or the content cannot be extracted."
        )


class NavigateAgentInput(BaseModel):
    """Input schema for NavigateAgent. Defines the URL to navigate to and the action to perform.

    For example, to summarize the content of a webpage, the input would be:
    {
        "url": "https://example.com",
        "action": "summarize"
    },
    to extract specific information, the action could be "extract information about X".
    """

    url: str = Field(..., description="The URL to navigate to.")
    action: str = Field(default="summarize", description="The action to perform on the URL.")


class NavigateAgent(BaseAgent):
    """Agent to navigate to a URL and perform actions."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1_MINI,
        instructions_template: str = "navigate.system.jinja",
    ):
        """Init method."""
        name = "Navigate Website"
        instructions = self._render_prompt(
            instructions_template,
            time=iso_to_clear_date(datetime.now().isoformat()),
        )

        super().__init__(
            name=name,
            model=model,
            instructions=instructions,
            model_settings=None,
            tools=[fetch_url_content],
        )

        self._input_type = NavigateAgentInput

    @classmethod
    def from_config(cls, config: BaseAgentConfig) -> NavigateAgent:
        """Create an instance of NavigateAgent from configuration."""
        return cls(
            model=config.model,
            instructions_template=config.instructions_template,
        )

    async def _input_formatter(self, context, input: NavigateAgentInput):
        return self._render_prompt(
            "navigate.user.jinja",
            url=input.url,
            action=input.action,
        )
