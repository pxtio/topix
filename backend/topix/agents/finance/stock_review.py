"""Stock review Agent."""
from datetime import datetime

from agents import ModelSettings, Tool

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.outputs import NotifyOutput
from topix.agents.websearch.handler import WebSearchHandler


class StockReviewAgent(BaseAgent):
    """Stock review Agent for synthesizing the actual value of a company."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
        instructions_template: str = "finance/stockreview.system.jinja",
        model_settings: ModelSettings | None = None,
        web_search: Tool | None = None
    ):
        """Init method."""
        name = "Stock Reviewer"
        instructions = self._render_prompt(
            instructions_template,
            time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )

        if not web_search:
            web_search = WebSearchHandler.get_openai_web_tool()

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.3)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            output_type=NotifyOutput,
            tools=[web_search],
        )
        super().__post_init__()

    async def _input_formatter(
        self, context: Context, input: str
    ) -> str:
        """Format the input for the agent.

        Args:
            context (Context): The agent context.
            input (str): The input to format.

        Returns:
            str: The formatted input string.

        """
        # Optionally, you could include chat history if relevant.
        user_prompt = self._render_prompt(
            "finance/stockreview.user.jinja",
            input=input,
        )
        return user_prompt
