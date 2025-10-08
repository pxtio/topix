"""Web Search Agent using Openai Default Web Search Tool."""

import datetime

from agents import ModelSettings, RunResult, RunResultStreaming, WebSearchTool

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.outputs import SearchResult, WebSearchOutput
from topix.agents.datatypes.web_search import WebSearchContextSize
<<<<<<< HEAD
=======
from topix.datatypes.recurrence import Recurrence
>>>>>>> 80f0022b0b9e3f79a90f348bb3fae444b5ae4dec


class OpenAIWebSearch(BaseAgent):
    """Web Search Agent using WebSearchTool from openai.

    returning an answer with web page citations
    """

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_5_MINI,
        instructions_template: str = "web_search.jinja",
        model_settings: ModelSettings | None = None,
        search_context_size: WebSearchContextSize = WebSearchContextSize.MEDIUM,
<<<<<<< HEAD
=======
        recency: Recurrence | None = None,
>>>>>>> 80f0022b0b9e3f79a90f348bb3fae444b5ae4dec
    ):
        """Initialize the WebSearch agent."""
        name = "OpenAI Web Search"

        # Enhanced instructions that include citation requirements
        instructions_dict = {
            "time": datetime.datetime.now().strftime("%Y-%m-%d"),
        }
        instructions = self._render_prompt(instructions_template, **instructions_dict)
        # Configure tools based on search engine
        tools = [WebSearchTool(search_context_size=search_context_size)]

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=tools,
        )

        super().__post_init__()

    async def _output_extractor(
        self,
        context: Context,
        output: RunResult | RunResultStreaming,
    ) -> WebSearchOutput:
        existing_urls = set()
        search_results: list[SearchResult] = []
        # Extract citations from the final output
        for item in output.new_items:
            if item.type == "message_output_item":
                for annotation in item.raw_item.content[0].annotations:
                    if annotation.type == "url_citation":
                        if annotation.url not in existing_urls:
                            existing_urls.add(annotation.url)
                            search_results.append(
                                SearchResult(url=annotation.url, title=annotation.title)
                            )

        output = WebSearchOutput(
            answer=output.final_output, search_results=search_results
        )
        return output
