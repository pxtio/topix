"""Answer Reformulation Agent."""

import uuid

from openai.types.responses import ResponseTextDeltaEvent

from agents import Agent, ModelSettings, RunContextWrapper, Runner
from topix.agents.base import BaseAgentManager
from topix.agents.datatypes import (
    AgentStreamMessage,
    AgentToolName,
    Context,
    StreamMessageType,
    ToolExecutionState,
)
from topix.agents.prompt_utils import render_prompt
from topix.agents.utils import format_tool_finished_message, format_tool_start_message


class AnswerReformulate(BaseAgentManager):
    """A manager for the answer reformulation agent."""

    name = "Answer Reformulation"
    model_name = "gpt-4.1-mini"
    prompts = {
        "system": "answer_reformulation.system.jinja",
        "user": "answer_reformulation.user.jinja",
    }

    def __init__(self):
        """Init method."""
        self.agent = Agent[Context](
            name=self.name,
            instructions=render_prompt(self.prompts["system"]),
            model=self.model_name,
            output_type=str,
            model_settings=ModelSettings(temperature=0.1)
        )

    @classmethod
    def _input_format(cls, context: Context, query: str) -> str:
        """Format the input for the answer reformulation agent."""
        kb_search_results = "\n\n".join(context.kb_search_results) \
            if context.kb_search_results else ""
        web_search_results = "\n\n".join(context.web_search_results) \
            if context.web_search_results else ""

        return render_prompt(
            cls.prompts["user"],
            query=query,
            web_search_results=web_search_results,
            kb_search_results=kb_search_results
        )

    async def run(self, context: Context, query: str) -> str:
        """Run the answer reformulation agent with the provided context and query.

        Returns:
            str: The generated answer.

        """
        res = await Runner.run(
            self.agent,
            input=self._input_format(context, query),
        )
        return res.final_output

    async def as_tool(
        self,
        wrapper: RunContextWrapper[Context],
        query: str
    ) -> str:
        """Run the answer reformulation agent as a tool with the provided query.

        Args:
            wrapper (RunContextWrapper): The context wrapper containing
                the context and other parameters.
            query (str): The clear version of user's question.

        Returns:
            str: The generated answer.

        """
        id_ = uuid.uuid4().hex
        await wrapper.context._message_queue.put(
            AgentStreamMessage(
                type=StreamMessageType.STATE,
                tool_id=id_,
                tool_name=AgentToolName.ANSWER_REFORMULATE,
                execution_state=ToolExecutionState.STARTED,
                status_message=format_tool_start_message(self.name, query)
            )
        )

        res = Runner.run_streamed(
            self.agent,
            context=wrapper.context,
            input=self._input_format(wrapper.context, query),
            max_turns=2,
        )
        async for event in res.stream_events():
            if event.type == "raw_response_event" and \
                    isinstance(event.data, ResponseTextDeltaEvent):
                await wrapper.context._message_queue.put(
                    AgentStreamMessage(
                        type=StreamMessageType.TOKEN,
                        tool_id=id_,
                        tool_name=AgentToolName.ANSWER_REFORMULATE,
                        content=event.data.delta
                    )
                )

        await wrapper.context._message_queue.put(
            AgentStreamMessage(
                type=StreamMessageType.STATE,
                tool_id=id_,
                tool_name=AgentToolName.ANSWER_REFORMULATE,
                execution_state=ToolExecutionState.COMPLETED,
                status_message=format_tool_finished_message(
                    self.name,
                    "Answer reformulation completed successfully."
                )
            )
        )

        return res.final_output
