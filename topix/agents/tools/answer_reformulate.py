"""Answer Reformulation Agent."""

import uuid

from agents import Agent, ModelSettings, RunContextWrapper, Runner
from topix.agents.base import BaseToolAgentManager
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.stream import AgentStreamMessage, StreamMessageType, ToolExecutionState
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.prompt_utils import render_prompt
from topix.agents.utils import format_tool_completed_message, format_tool_start_message


class AnswerReformulate(BaseToolAgentManager):
    """A manager for the answer reformulation agent."""

    name = "Answer Reformulation"
    model_name = "gpt-4.1-mini"
    prompts = {
        "system": "answer_reformulation.system.jinja",
        "user": "answer_reformulation.user.jinja",
    }

    def __init__(self):
        """Init method."""
        self.agent = Agent[ReasoningContext](
            name=self.name,
            instructions=render_prompt(self.prompts["system"]),
            model=self.model_name,
            output_type=str,
            model_settings=ModelSettings(temperature=0.1)
        )

    @classmethod
    def _input_format(cls, context: ReasoningContext, query: str) -> str:
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

    async def run(self, context: ReasoningContext, query: str) -> str:
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
        wrapper: RunContextWrapper[ReasoningContext],
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
        fixed_params = {
            "tool_id": id_,
            "tool_name": AgentToolName.ANSWER_REFORMULATE,
        }

        await wrapper.context._message_queue.put(
            AgentStreamMessage(
                type=StreamMessageType.STATE,
                execution_state=ToolExecutionState.STARTED,
                status_message=format_tool_start_message(
                    self.name,
                    f"Query: `{query}`."
                ),
                **fixed_params
            )
        )

        res = Runner.run_streamed(
            self.agent,
            context=wrapper.context,
            input=self._input_format(wrapper.context, query),
            max_turns=2,
        )
        async for stream_chunk in self.handle_stream_events(res, **fixed_params):
            await wrapper.context._message_queue.put(stream_chunk)

        await wrapper.context._message_queue.put(
            AgentStreamMessage(
                type=StreamMessageType.STATE,
                execution_state=ToolExecutionState.COMPLETED,
                status_message=format_tool_completed_message(
                    self.name,
                    "Answer reformulation completed successfully."
                ),
                **fixed_params
            )
        )

        return res.final_output
