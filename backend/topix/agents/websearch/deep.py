"""Deep Web Search Agent with Citation Support."""

import datetime

from typing import Any, Literal

from agents import (
    Agent,
    AgentHooks,
    ModelSettings,
    RunContextWrapper,
    Tool,
    TResponseInputItem,
    function_tool,
)

from topix.agents.websearch.tools import (
    fetch_content,
    search_linkup,
    search_tavily,
)
from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.outputs import WebSearchOutput
from topix.agents.datatypes.web_search import WebSearchContextSize, WebSearchOption


class WebSearchAgentHook(AgentHooks):
    """Custom hook to handle the context and results of the web search agent."""

    async def on_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        output: Any,
    ):
        """Initialize the context for the web search agent."""
        # Initialize the context if not already done
        for tool in agent.tools:
            tool.is_enabled = True

    async def on_tool_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        tool: Tool,
        result: str,
    ):
        """Handle tool calls and update the context with the results."""
        tool.is_enabled = False

    async def on_llm_start(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        system_prompt: str,
        input_items: list[TResponseInputItem],
    ):
        """Check if all tools are disabled."""
        for tool in agent.tools:
            if tool.is_enabled:
                return
        enhance_prompt = """
        1. Your output findings should be fully comprehensive and include ALL RELEVANT information and sources that the researcher has gathered from tool calls and web searches. It is expected that you repeat key information verbatim.
        2. This report can be as long as necessary to return ALL of the information that the researcher has gathered.
        3. In your report, you should return inline citations for each source that the researcher found.
        4. Make sure to include ALL RELEVANT sources that the researcher gathered in the report, and how they were used to answer the question!
        6. It's really important not to lose any relevant sources. A later LLM will be used to merge this report with others, so having all of the sources is critical.
        """  # noqa: E501
        input_items.append({"role": "user", "content": enhance_prompt})


class DeepWebSearch(BaseAgent):
    """Web Search Agent returning an answer with web page citations.

    Supports multiple search engines (OpenAI, Perplexity, Tavily).
    """

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O_MINI,
        instructions_template: str = "deep_websearch.jinja",
        model_settings: ModelSettings | None = None,
        search_engine: Literal[
            WebSearchOption.TAVILY, WebSearchOption.LINKUP
        ] = WebSearchOption.TAVILY,
        extract_depth: Literal["basic", "advanced"] = "basic",
    ):
        """Initialize the WebSearch agent."""
        name = "Deep Web Search"
        self.search_engine = search_engine

        # Enhanced instructions that include citation requirements
        instructions_dict = {
            "time": datetime.datetime.now().strftime("%Y-%m-%d"),
        }
        instructions = self._render_prompt(instructions_template, **instructions_dict)
        # Configure tools based on search engine

        hooks = WebSearchAgentHook()

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        tools = self._configure_tools(model, extract_depth)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=tools,
            hooks=hooks,
        )
        super().__post_init__()

    def _configure_tools(
        self,
        model: str,
        extract_depth: Literal["basic", "advanced"],
    ) -> list[Tool]:
        """Configure tools based on search engine and model."""
        tools = []

        @function_tool
        async def fetch_content_webpage(web_url: str) -> str:
            """Read the content of a website given its URL.

            Args:
                web_url (str): The URL of the website to read.

            Returns:
                str: The full content of the website.

            """
            return await fetch_content(web_url, extract_depth, client=self._httpx_client)

        tools.append(fetch_content_webpage)

        @function_tool
        async def web_search(query: str) -> WebSearchOutput:
            """Search using Tavily / Linkup."""
            if self.search_engine == WebSearchOption.TAVILY:
                return await search_tavily(
                    query,
                    search_context_size=WebSearchContextSize.MEDIUM
                )
            elif self.search_engine == WebSearchOption.LINKUP:
                return await search_linkup(
                    query,
                    search_context_size=WebSearchContextSize.MEDIUM
                )
            else:
                raise ValueError(
                    f"Unknown search engine: {self.search_engine}"
                )

        tools.append(web_search)
        return tools

    async def _output_extractor(self, context, output) -> WebSearchOutput:
        search_results = []
        for item in output.new_items:
            if item.type == "tool_call_output_item":
                # Get function calling results
                if isinstance(item.output, WebSearchOutput):
                    search_results.extend(item.output.search_results)
                else:
                    raise ValueError(
                        "Expected WebSearchOutput from tool call, got "
                        f"{type(item.output)}"
                    )
        return WebSearchOutput(
            answer=output.final_output, search_results=search_results
        )
