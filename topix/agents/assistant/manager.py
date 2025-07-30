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
from topix.utils.common import gen_uid


class AssistantManager:
    """Orchestrates the full flow: query rewrite, planning, searching ..."""

    def __init__(self, query_rewrite_agent: QueryRewrite, plan_agent: Plan):
        """Init method."""
        self.query_rewrite_agent = query_rewrite_agent
        self.plan_agent = plan_agent

    async def _rewrite_query(
        self,
        context: ReasoningContext,
        query: str,
        session: AssistantSession | None = None,
    ) -> str:
        if session:
            history = await session.get_items()
            if history:
                context.chat_history = history
                query_input = QueryRewriteInput(query=query, chat_history=history)
                # launch query rewrite:
                return await AgentRunner.run(
                    self.query_rewrite_agent,
                    input=query_input,
                )
            else:
                return query
        return query

    async def run(
        self,
        context: ReasoningContext,
        query: str,
        session: AssistantSession | None = None,
        message_id: str | None = None,
        max_turns: int = 5,
    ) -> str:
        """Run the assistant agent with the provided context and query."""
        new_query = await self._rewrite_query(context, query, session)

        if session:
            await session.add_items(
                [{"id": message_id or gen_uid(), "role": "user", "content": query}]
            )
        # launch plan:
        res = await AgentRunner.run(
            self.plan_agent, input=new_query, context=context, max_turns=max_turns
        )
        if session:
            await session.add_items(
                [{"id": gen_uid(), "role": "assistant", "content": res}]
            )
        return res

    async def run_streamed(
        self,
        context: ReasoningContext,
        query: str,
        session: AssistantSession | None = None,
        message_id: str | None = None,
        max_turns: int = 5,
    ) -> AsyncGenerator[AgentStreamMessage, str]:
        """Run the assistant agent with the provided context and query.

        If a session is provided, use it to store the user query and retrieve the chat history.
        Otherwise, do not use any chat history.

        Yields:
            AgentStreamMessage: The messages from the agent.

        """
        # Notify the start of the agent stream
        new_query = await self._rewrite_query(context, query, session)

        if session:
            await session.add_items(
                [{"id": message_id or gen_uid(), "role": "user", "content": query}]
            )

        # launch plan:
        res = AgentRunner.run_streamed(
            self.plan_agent, input=new_query, context=context, max_turns=max_turns
        )

        raw_answer = ""
        async for message in res:
            if self._is_response(message):
                if message.tool_name in [
                    AgentToolName.RAW_MESSAGE,
                    AgentToolName.ANSWER_REFORMULATE,
                ]:
                    raw_answer += message.content.text
            yield message

        if session:
            # If a session is provided, store the final answer
            await session.add_items(
                [
                    {
                        "id": gen_uid(),
                        "role": "assistant",
                        "content": raw_answer,
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
