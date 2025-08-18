"""Main agent manager."""

from collections.abc import AsyncGenerator

from topix.agents.assistant.plan import Plan
from topix.agents.assistant.query_rewrite import QueryRewrite
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.inputs import QueryRewriteInput
from topix.agents.datatypes.stream import AgentStreamMessage, ContentType
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.run import AgentRunner
from topix.agents.sessions import AssistantSession
from topix.datatypes.chat.reasoning import ReasoningStep, ReasoningStepState
from topix.utils.common import gen_uid


class AssistantManager:
    """Orchestrates the full flow: query rewrite, planning, searching ..."""

    def __init__(self, query_rewrite_agent: QueryRewrite, plan_agent: Plan):
        """Init method."""
        self.query_rewrite_agent = query_rewrite_agent
        self.plan_agent = plan_agent

    async def _compose_input(
        self,
        context: ReasoningContext,
        query: str,
        session: AssistantSession | None = None,
        rephrase_query: bool = False
    ) -> list[dict[str, str]]:
        if session:
            history = await session.get_items()
            if history:
                context.chat_history = history
                if rephrase_query:
                    # launch query rewrite:
                    query_input = QueryRewriteInput(query=query, chat_history=history)
                    new_query = await AgentRunner.run(
                        self.query_rewrite_agent,
                        input=query_input,
                    )
                else:
                    new_query = query
                return history + [{"role": "user", "content": new_query}]
            else:
                return [{"role": "user", "content": query}]
        return [{"role": "user", "content": query}]

    async def run(
        self,
        context: ReasoningContext,
        query: str,
        session: AssistantSession | None = None,
        message_id: str | None = None,
        max_turns: int = 5,
        rephrase_query: bool = False
    ) -> str:
        """Run the assistant agent with the provided context and query."""
        input = await self._compose_input(context, query, session, rephrase_query=rephrase_query)

        if session:
            await session.add_items(
                [{"id": message_id or gen_uid(), "role": "user", "content": query}]
            )
        # launch plan:
        res = await AgentRunner.run(
            self.plan_agent, input=input, context=context, max_turns=max_turns
        )
        if session:
            await session.add_items(
                [{"id": gen_uid(), "role": "assistant", "content": res}]
            )
        return res

    @staticmethod
    def _update_reasoning_step(
        steps: dict[str, ReasoningStep],
        message: AgentStreamMessage
    ) -> ReasoningStep:
        """Update the reasoning step based on the message."""
        if message.tool_id not in steps:
            steps[message.tool_id] = ReasoningStep(
                id=message.tool_id,
                name=message.tool_name,
                response="",
                event_messages=[],
                state=ReasoningStepState.STARTED,
            )
        if message.content:
            if message.content.type != ContentType.STATUS:
                steps[message.tool_id].response += message.content.text
            else:
                steps[message.tool_id].event_messages.append(message.content.text)
        if message.is_stop:
            steps[message.tool_id].state = ReasoningStepState.COMPLETED
        return steps[message.tool_id]

    async def run_streamed(  # noqa: C901
        self,
        context: ReasoningContext,
        query: str,
        session: AssistantSession | None = None,
        message_id: str | None = None,
        max_turns: int = 8,
        rephrase_query: bool = False
    ) -> AsyncGenerator[AgentStreamMessage, str]:
        """Run the assistant agent with the provided context and query.

        If a session is provided, use it to store the user query and retrieve the chat history.
        Otherwise, do not use any chat history.

        Yields:
            AgentStreamMessage: The messages from the agent.

        """
        # Notify the start of the agent stream
        agent_input = await self._compose_input(context, query, session, rephrase_query=rephrase_query)

        if session:
            await session.add_items(
                [{"id": message_id or gen_uid(), "role": "user", "content": query}]
            )

        # launch plan:
        res = AgentRunner.run_streamed(
            self.plan_agent, input=agent_input, context=context, max_turns=max_turns
        )

        final_message = ""
        is_raw_answer = True
        steps = {}
        async for message in res:
            self._update_reasoning_step(steps, message)
            if self._is_response(message):
                # if answer reformulate is used, reset final_message
                if message.tool_name == AgentToolName.ANSWER_REFORMULATE and \
                        is_raw_answer:
                    final_message = ""
                    is_raw_answer = False
                if message.tool_name in [
                    AgentToolName.RAW_MESSAGE,
                    AgentToolName.ANSWER_REFORMULATE,
                ]:
                    final_message += message.content.text
            yield message

        if session:
            # If a session is provided, store the final answer
            if not final_message.strip():
                # Answer is empty
                raise ValueError("No answer generated by the agent.")

            await session.add_items(
                [
                    {
                        "id": gen_uid(),
                        "role": "assistant",
                        "content": final_message,
                        "reasoning_steps": [val.model_dump(exclude_none=True) for val in steps.values()],
                    }
                ]
            )

    @staticmethod
    def _is_response(message: str | AgentStreamMessage) -> bool:
        """Check if the message is a response."""
        return isinstance(message, AgentStreamMessage) and (
            message.content
            and message.content.type in [ContentType.MESSAGE, ContentType.TOKEN]
        )
