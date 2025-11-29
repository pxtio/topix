"""Deep Research Agents."""

import logging

from datetime import datetime
from typing import AsyncGenerator

from agents import FunctionTool, ModelSettings

from topix.agents.base import BaseAgent
from topix.agents.config import DeepResearchConfig
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.stream import AgentStreamMessage
from topix.agents.datatypes.tool_call import ToolCall
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.run import AgentRunner
from topix.agents.sessions import AssistantSession, Message
from topix.agents.websearch.handler import WebSearchHandler
from topix.api.utils.common import iso_to_clear_date
from topix.datatypes.property import ReasoningProperty
from topix.datatypes.resource import RichText
from topix.utils.common import gen_uid

logger = logging.getLogger(__name__)


class WebCollector(BaseAgent):
    """Collect information from websites given an outline."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_5,
        instructions_template: str = "deep_research/web_collector.jinja",
        model_settings: ModelSettings | None = None,
        web_search_tool: FunctionTool | None = None,
    ):
        """Init method."""
        name = "Web Collector"
        instructions = self._render_prompt(
            instructions_template,
            time=iso_to_clear_date(datetime.now().isoformat()),
        )
        if model_settings is None:
            model_settings = ModelSettings(max_tokens=8000)

        if not web_search_tool:
            web_search_tool = WebSearchHandler.get_openai_web_tool()

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=[web_search_tool],
        )
        super().__post_init__()

    @classmethod
    def from_config(
        cls,
        config: DeepResearchConfig.WebCollectorConfig,
    ):
        """Init from config."""
        web_tool = WebSearchHandler.from_config(config.web_search)

        return cls(
            model=config.model,
            instructions_template=config.instructions_template,
            model_settings=config.model_settings,
            web_search_tool=web_tool,
        )


class Synthesizer(BaseAgent):
    """Synthesis the information and generate final learning drop."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
        instructions_template: str = "deep_research/synthesis.system.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Init method."""
        name = "Synthesizer"
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

    async def _input_formatter(self, context, input):
        outline = input
        materials = ""
        if context.tool_calls:
            materials = "\n\n".join(
                [str(tool_call.output) for tool_call in context.tool_calls]
            )

        user_prompt = self._render_prompt(
            "deep_research/synthesis.user.jinja",
            outline=outline,
            materials=materials,
        )

        return user_prompt


class DeepResearch:
    """Deep Research Manager."""

    def __init__(
        self,
        outline_generator: WebCollector,
        web_collector: WebCollector,
        synthesizer: Synthesizer,
    ):
        """Init three agents."""
        self.outline_generator = outline_generator
        self.web_collector = web_collector
        self.synthesizer = synthesizer

    @classmethod
    def from_config(
        cls,
        config: DeepResearchConfig,
    ) -> "DeepResearch":
        """Init web module generator from config."""
        outline_generator = WebCollector.from_config(config.outline_generator)
        web_collector = WebCollector.from_config(config.web_collector)
        synthesizer = Synthesizer.from_config(config.synthesis)
        return cls(outline_generator, web_collector, synthesizer)

    @classmethod
    def from_yaml(cls, filepath: str | None = None):
        """Init web module generator from yaml file."""
        config = DeepResearchConfig.from_yaml(filepath=filepath)
        return cls.from_config(config)

    async def run_streamed(  # noqa: C901
        self,
        context: ReasoningContext,
        query: str,
        session: AssistantSession | None = None,
        message_id: str | None = None,
        max_turn: int = 8,
    ) -> AsyncGenerator[AgentStreamMessage, str]:
        """Run deep research in stream mode."""
        if session:
            await session.add_items(
                [
                    Message(
                        id=message_id or gen_uid(),
                        role="user",
                        content=RichText(markdown=query),
                    )
                ]
            )

        # Generate outline in non streaming mode
        messages = AgentRunner.run_streamed(
            starting_agent=self.outline_generator,
            input=query,
            context=context,
            name=AgentToolName.OUTLINE_GENERATOR,
        )

        outline = ""
        async for msg in messages:
            if not isinstance(msg, ToolCall):
                yield msg
            else:
                outline = msg.output

        if not outline:
            raise ValueError("Problem on generating outline")

        # Collect Web contents:
        try:
            messages = AgentRunner.run_streamed(
                starting_agent=self.web_collector,
                input=outline,
                context=context,
                max_turns=max_turn,
                name=AgentToolName.WEB_COLLECTOR,
            )
            async for msg in messages:
                if not isinstance(msg, ToolCall):
                    yield msg
        except Exception as e:
            logger.warning(
                f"Web collection failed: {e}, mainly due to attend max turn limit."
            )

        # Synthesize final answer
        messages = AgentRunner.run_streamed(
            starting_agent=self.synthesizer,
            input=outline,
            context=context,
            name=AgentToolName.SYNTHESIZER,
        )

        final_answer = ""
        async for msg in messages:
            if not isinstance(msg, ToolCall):
                yield msg
            else:
                final_answer = msg.output

        if not final_answer:
            raise ValueError("Problem on synthesizing report.")

        steps = context.tool_calls

        main_message = Message(
            role="assistant",
            content=RichText(markdown=final_answer),
            properties={
                "reasoning": ReasoningProperty(
                    reasoning=[step.model_dump(exclude_none=True) for step in steps]
                )
            },
        )
        if session:
            await session.add_items([main_message])
