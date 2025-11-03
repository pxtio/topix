"""Stock review agent."""
from __future__ import annotations

from datetime import datetime

from agents import ModelSettings, Tool
from pydantic import BaseModel

from topix.agents.base import BaseAgent
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.websearch.handler import WebSearchHandler
from topix.api.utils.common import iso_to_clear_date


class StockReviewInput(BaseModel):
    """Input for the Stock Review agent."""

    stock: str
    search_results: str | None = None
    previous_review: str | None = None


class StockReviewCollector(BaseAgent):
    """Agent that collects stock review from various sources."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
        instructions_template: str = "finance/stockcollector.system.jinja",
        model_settings: ModelSettings | None = None,
        web_search: Tool | None = None
    ):
        """Init method."""
        name = "Stock Review Collector"
        instructions = self._render_prompt(
            instructions_template,
            time=iso_to_clear_date(datetime.now().isoformat()),
        )

        if not web_search:
            web_search = WebSearchHandler.get_openai_web_tool()

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=[web_search],
        )
        super().__post_init__()

    async def _input_formatter(
        self,
        context,
        input: StockReviewInput,
    ):
        return self._render_prompt(
            "finance/stockcollector.user.jinja",
            input=input.stock,
            previous_review=input.previous_review if input.previous_review else "None"
        )


class StockReviewSynthesizer(BaseAgent):
    """Agent that synthesizes the stock review."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
        instructions_template: str = "finance/stockreview.system.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Init method."""
        name = "Stock Review Synthesizer"
        instructions = self._render_prompt(
            instructions_template,
            time=iso_to_clear_date(datetime.now().isoformat()),
        )

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=[]
        )
        super().__post_init__()

    async def _input_formatter(
        self,
        context,
        input: StockReviewInput
    ):
        """Format input for the agent."""
        return self._render_prompt(
            "finance/stockreview.user.jinja",
            time=iso_to_clear_date(datetime.now().isoformat()),
            input=input.stock,
            search_results=input.search_results if input.search_results else "None",
            previous_review=input.previous_review if input.previous_review else "None"
        )
