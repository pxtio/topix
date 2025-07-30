"""Main agent manager."""

from collections.abc import AsyncGenerator

from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.stream import (
    AgentStreamMessage,
    StreamMessageType,
    ToolExecutionState,
)
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.sessions import AssistantSession
from topix.agents.assistant.query_rewrite import QueryRewrite
from topix.agents.assistant.plan import Plan
from topix.agents.datatypes.inputs import QueryRewriteInput
from topix.agents.run import AgentRunner
from topix.utils.common import gen_uid


class AssistantManager:
    """
    Orchestrates the full flow: query rewrite, planning, searching ...
    """

    def __init__(self, query_rewrite_agent: QueryRewrite, plan_agent: Plan):
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
        id_ = gen_uid()
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
            await session.add_items([{"id": id_, "role": "assistant", "content": res}])
        return res

    async def run_streamed(
        self,
        context: ReasoningContext,
        query: str,
        session: AssistantSession | None = None,
        message_id: str | None = None,
        max_turns: int = 5,
    ) -> AsyncGenerator[AgentStreamMessage, str]:
        """
        Run the assistant agent with the provided context and query.

        If a session is provided, use it to store the user query and retrieve the chat history.
        Otherwise, do not use any chat history.

        Yields:
            AgentStreamMessage: The messages from the agent.
        """
        id_ = gen_uid()

        # Notify the start of the agent stream
        new_query = await self._rewrite_query(context, query, session)

        if session:
            await session.add_items(
                [{"id": message_id or gen_uid(), "role": "user", "content": query}]
            )

        start_msg = AgentStreamMessage(
            type=StreamMessageType.STATE,
            tool_id=id_,
            tool_name=AgentToolName.RAW_MESSAGE,
            execution_state=ToolExecutionState.STARTED,
            status_message=f"✅ [Answering for query] `{new_query}`",
        )
        await context._message_queue.put(start_msg)
        yield start_msg

        # launch plan:
        res = AgentRunner.run_streamed(
            self.plan_agent, input=new_query, context=context, max_turns=max_turns
        )

        raw_answer = ""
        final_answer = ""
        async for message in res:
            if self._is_content(message):
                if message.tool_name == AgentToolName.RAW_MESSAGE:
                    raw_answer += message.delta.content
                elif message.tool_name == AgentToolName.ANSWER_REFORMULATE:
                    if message.delta:
                        final_answer += message.delta.content
                    if message.chunk:
                        final_answer += message.chunk.content
            yield message

        if session:
            # If a session is provided, store the final answer
            await session.add_items(
                [
                    {
                        "id": id_,
                        "role": "assistant",
                        "content": final_answer if final_answer else raw_answer,
                    }
                ]
            )

    @staticmethod
    def _is_content(message: str | AgentStreamMessage) -> bool:
        """Check if the message is a content."""
        return isinstance(message, AgentStreamMessage) and (
            message.type in [StreamMessageType.TOKEN, StreamMessageType.CHUNK]
        )
