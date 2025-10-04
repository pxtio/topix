"""Main agent manager."""

import logging

from collections.abc import AsyncGenerator

from topix.agents.assistant.answer_reformulate import AnswerReformulate
from topix.agents.assistant.plan import Plan
from topix.agents.assistant.query_rewrite import QueryRewrite
from topix.agents.config import AssistantManagerConfig
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.inputs import QueryRewriteInput
from topix.agents.datatypes.stream import (
    AgentStreamMessage,
    ContentType,
    StreamingMessageType,
)
from topix.agents.run import AgentRunner
from topix.agents.sessions import AssistantSession
from topix.datatypes.chat.chat import Message
from topix.datatypes.property import ReasoningProperty
from topix.datatypes.resource import RichText
from topix.store.qdrant.store import ContentStore
from topix.utils.common import gen_uid

logger = logging.getLogger(__name__)


class AssistantManager:
    """Orchestrates the full flow: query rewrite, planning, searching ..."""

    def __init__(
        self,
        query_rewrite_agent: QueryRewrite,
        plan_agent: Plan,
        synthesis_agent: AnswerReformulate,
    ):
        """Init method."""
        self.query_rewrite_agent = query_rewrite_agent
        self.plan_agent = plan_agent
        self.synthesis_agent = synthesis_agent

    @classmethod
    def from_config(cls, content_store: ContentStore, config: AssistantManagerConfig):
        """Create an instance of AssistantManager from configuration."""
        plan_agent = Plan.from_config(content_store, config.plan)
        query_rewrite_agent = QueryRewrite.from_config(config.query_rewrite)
        synthesis_agent = AnswerReformulate.from_config(config.synthesis)

        return cls(query_rewrite_agent, plan_agent, synthesis_agent)

    async def _compose_input(
        self,
        context: ReasoningContext,
        query: str,
        session: AssistantSession | None = None,
        rephrase_query: bool = False,
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
        rephrase_query: bool = False,
    ) -> str:
        """Run the assistant agent with the provided context and query."""
        input = await self._compose_input(
            context, query, session, rephrase_query=rephrase_query
        )

        if session:
            await session.add_items(
                [
                    {
                        "id": message_id or gen_uid(),
                        "role": "user",
                        "content": {"markdown": query},
                    }
                ]
            )
        # launch plan:
        try:
            res = await AgentRunner.run(
                self.plan_agent, input=input, context=context, max_turns=max_turns
            )
        except Exception:
            logger.info(f"Max turns exceeded: {max_turns}", exc_info=True)

        # launch synthesis:
        res = await AgentRunner.run(self.synthesis_agent, input=query, context=context)

        if session:
            await session.add_items(
                [{"id": gen_uid(), "role": "assistant", "content": {"markdown": res}}]
            )
        return res

    async def run_streamed(  # noqa: C901
        self,
        context: ReasoningContext,
        query: str,
        session: AssistantSession | None = None,
        message_id: str | None = None,
        max_turns: int = 8,
        rephrase_query: bool = False,
    ) -> AsyncGenerator[AgentStreamMessage, str]:
        """Run the assistant agent with the provided context and query.

        If a session is provided, use it to store the user query and retrieve the chat history.
        Otherwise, do not use any chat history.

        Yields:
            AgentStreamMessage: The messages from the agent.

        """
        # Notify the start of the agent stream
        agent_input = await self._compose_input(
            context, query, session, rephrase_query=rephrase_query
        )

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

        # launch plan:
        res = AgentRunner.run_streamed(
            self.plan_agent, input=agent_input, context=context, max_turns=max_turns
        )

        async for message in res:
            if isinstance(message, AgentStreamMessage):
                yield message

        # Launch the synthesis agent:
        res = AgentRunner.run_streamed(
            self.synthesis_agent, input=query, context=context
        )

        final_answer = ""
        async for message in res:
            if isinstance(message, AgentStreamMessage) and message.type == StreamingMessageType.STREAM_MESSAGE:
                if message.content and message.content.type in [
                    ContentType.MESSAGE,
                    ContentType.TOKEN,
                ]:
                    final_answer += message.content.text
                yield message

        if session:
            if not context.tool_calls:
                raise Exception("No steps created during streaming!")

            await session.add_items(
                [
                    Message(
                        role="assistant",
                        content=RichText(markdown=final_answer),
                        properties={
                            "reasoning": ReasoningProperty(
                                reasoning=[
                                    step.model_dump(exclude_none=True)
                                    for step in context.tool_calls
                                ]
                            )
                        },
                    )
                ]
            )
