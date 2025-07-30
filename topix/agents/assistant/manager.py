"""Main agent manager."""

from collections.abc import AsyncGenerator

from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.stream import AgentStreamMessage, StreamMessageType
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.sessions import AssistantSession
from topix.agents.assistant.query_rewrite import QueryRewrite
from topix.agents.assistant.plan import Plan
from topix.agents.datatypes.inputs import QueryRewriteInput
from topix.agents.run import AgentRunner


class AssistantManager:
    """
    Orchestrates the full flow: query rewrite, planning, searching ...
    """
    def __init__(
        self,
        query_rewrite_agent: QueryRewrite,
        plan_agent: Plan
    ):
        self.query_rewrite_agent = query_rewrite_agent
        self.plan_agent = plan_agent

    async def _rewrite_query(
        self,
        query: str,
        session: AssistantSession | None = None
    ) -> str:
        if session:
            history = await session.get_items()
            await session.add_items([
                {
                    "role": "user",
                    "content": query
                }
            ])
            if history:
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
        max_turns: int = 5
    ) -> str:
        new_query = await self._rewrite_query(query, session)
        # launch plan:
        res = await AgentRunner.run(
            self.plan_agent,
            input=new_query,
            context=context,
            max_turns=max_turns
        )
        if session:
            await session.add_items([
                {
                    "role": "assistant",
                    "content": res
                }
            ])
        return res

    async def run_streamed(
        self,
        context: ReasoningContext,
        query: str,
        session: AssistantSession | None = None,
        max_turns: int = 5
    ) -> AsyncGenerator[AgentStreamMessage, str]:
        """
        Run the assistant agent with the provided context and query.

        If a session is provided, use it to store the user query and retrieve the chat history.
        Otherwise, do not use any chat history.

        Yields:
            AgentStreamMessage: The messages from the agent.
        """
        new_query = await self._rewrite_query(query, session)

        # launch plan:
        res = AgentRunner.run_streamed(
            self.plan_agent,
            input=new_query,
            context=context,
            max_turns=max_turns
        )

        raw_answer = ""
        final_answer = ""
        async for message in res:
            if self._is_delta(message):
                if message.tool_name == AgentToolName.RAW_MESSAGE:
                    raw_answer += message.delta.content
                elif message.tool_name == AgentToolName.ANSWER_REFORMULATE:
                    final_answer += message.delta.content
            yield message

        if session:
            # If a session is provided, store the final answer
            await session.add_items([
                {
                    "role": "assistant",
                    "content": final_answer if final_answer else raw_answer
                }
            ])

    @staticmethod
    def _is_delta(message: str | AgentStreamMessage) -> bool:
        """Check if the message is a delta."""
        return (
            isinstance(message, AgentStreamMessage)
            and message.type == StreamMessageType.TOKEN
        )
