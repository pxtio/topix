"""Web Search Agent."""

import datetime
import re

from typing import Any

from agents import (
    Agent,
    AgentHooks,
    ModelSettings,
    ModelTracing,
    RunContextWrapper,
    Tool,
    WebSearchTool,
    function_tool,
    generation_span,
)
from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.stream import AgentStreamMessage, Content, ContentType
from topix.agents.utils import (
    ToolCall,
    tool_execution_handler,
)


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


class WebSearch(BaseAgent):
    """An Agent for web search operations.

    This class is responsible for managing the web search agent and its operations.
    """

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O_MINI,
        instructions_template: str = "web_search.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Initialize the WebSearch agent."""
        name = "Web Search"
        instructions_dict = {"time": datetime.datetime.now().strftime("%Y-%m-%d")}
        instructions = self._render_prompt(instructions_template, **instructions_dict)
        if model.startswith("perplexity"):
            tools = []
        elif model.startswith("openai"):
            tools = [WebSearchTool(search_context_size="medium")]
        else:
            raise ValueError(f"Unsupported model for web search: {model}")
        hooks = WebSearchAgentHook()

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=tools,
            hooks=hooks,
        )

        super().__post_init__()

    def as_tool(
        self,
        tool_name: str | None = None,
        tool_description: str | None = None,
        max_turns: int = 5,
        streamed: bool = False
    ) -> Tool:
        """Convert the web search agent into a tool.

        This is a temporary solution to make the perplexity agent callable as a tool.
        There is still an issue in the openai Agent where we can not call the perplexity
        model correctly, where the citation urls are missing.
        [see details](https://github.com/openai/openai-agents-python/issues/1346)

        """
        if isinstance(self.model, str):
            return super().as_tool(
                tool_name=tool_name,
                tool_description=tool_description,
                max_turns=max_turns,
                streamed=streamed,
            )

        name_override = tool_name or self.name

        @function_tool(
            name_override=name_override,
            description_override=tool_description or "",
        )
        async def run_agent(
            wrapper: RunContextWrapper[ReasoningContext],
            input: str,
        ) -> Tool:
            content = ""
            search_results = []
            context = wrapper.context
            async with tool_execution_handler(
                context, name_override, input
            ) as fixed_params:
                if streamed:
                    _, stream = await self._call_litellm(
                        streamed=True, input=input
                    )
                    async for chunk in stream:
                        if chunk.choices[0].delta.content is not None:
                            # Create the message for the stream
                            message = AgentStreamMessage(
                                content=Content(
                                    type=ContentType.TOKEN,
                                    text=chunk.choices[0].delta.content,
                                ),
                                **fixed_params,
                                is_stop=False,
                            )
                            # Add the message to the context
                            await context._message_queue.put(message)
                            content += chunk.choices[0].delta.content
                        # If there are search results, add them to the context
                        if hasattr(chunk, "search_results") and chunk.search_results:
                            search_results = chunk.search_results

                else:
                    response = await self._call_litellm(stream=False, input=input)
                    content = response.choices[0].message.content
                    search_results = response.search_results

                if search_results:
                    content = self._process_perplexity_response(content, search_results)

            context.tool_calls.append(
                ToolCall(
                    tool_id=fixed_params["tool_id"],
                    tool_name=name_override,
                    arguments={"input": input},
                    output=content,
                )
            )

            return content
        return run_agent

    async def _call_litellm(self, streamed: bool, input: str):
        tracing = ModelTracing.DISABLED
        with generation_span(
            model=str(self.model),
            model_config=self.model_settings.to_json_dict()
            | {"base_url": str(self.model.base_url or ""), "model_impl": "litellm"},
            disabled=tracing.is_disabled(),
        ) as span_generation:
            return await self.model._fetch_response(
                self.instructions,
                input,
                self.model_settings,
                self.tools,
                None,
                self.handoffs,
                span_generation,
                tracing,
                stream=streamed,
                prompt=None,
            )

    @staticmethod
    def _process_perplexity_response(content: str, search_results: list) -> str:
        citation_map = {}
        if search_results:
            # Create the citation map
            for idx, item in enumerate(search_results, 1):
                citation_map[str(idx)] = item["url"]

            def repl(match):
                # Replace the citations with the url
                num = match.group(1)
                url = citation_map.get(num, "#")
                return f"[[{num}]]({url})"

            # Replace the citations in the content
            content = re.sub(r"\[(\d+)\]", repl, content)
        return content
