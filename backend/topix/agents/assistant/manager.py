"""Main agent manager."""
from __future__ import annotations

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
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.run import AgentRunner
from topix.agents.sessions import AssistantSession
from topix.agents.utils.text import post_process_url_citations
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
    def from_config(
        cls,
        content_store: ContentStore,
        config: AssistantManagerConfig,
        memory_filters: dict | None = None,
    ) -> AssistantManager:
        """Create an instance of AssistantManager from configuration."""
        plan_agent = Plan.from_config(
            content_store,
            config.plan,
            memory_filters=memory_filters,
        )
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

    async def _postprocess_answer(
        self,
        answer: str,
        context: ReasoningContext,
    ) -> str:
        """Post process the final answer from the synthesis agent."""
        graph_uid: str | None
        if context.memory_search_filter is not None:
            graph_uid = context.memory_search_filter.get("graph_uid")
        else:
            graph_uid = None
        logger.info(f"Post-processing answer with graph_uid: {graph_uid}")
        logger.info(f"tool calls: {context.tool_calls}")
        valid_urls = []
        for tool_call in context.tool_calls:
            if tool_call.name == AgentToolName.WEB_SEARCH:
                search_results = tool_call.output.search_results
                for result in search_results:
                    valid_urls.append(result.url)

            # Correct shortened URLs in the answer by replacing shortened IDs with full IDs
            elif tool_call.name == AgentToolName.MEMORY_SEARCH:
                if graph_uid is not None:
                    for ref in tool_call.output.references:
                        logger.info(f"Processing reference of type and id: {ref.ref_type} - {ref.ref_id}")
                        url_short_id = f"(/{ref.ref_type}/{ref.ref_id[:5]})"
                        url_long_id = f"(/boards/{graph_uid}/{ref.ref_type}s/{ref.ref_id})"
                        answer = answer.replace(url_short_id, url_long_id)

        return post_process_url_citations(answer, valid_urls)

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

        res = await self._postprocess_answer(res, context)

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
        try:
            res = AgentRunner.run_streamed(
                self.plan_agent, input=agent_input, context=context, max_turns=max_turns
            )

            async for message in res:
                if isinstance(message, AgentStreamMessage):
                    yield message
        except Exception as e:
            logger.error(
                f"Plan agent execution error {e}, may due to Max turns exceeded",
                exc_info=True,
            )

        # Launch the synthesis agent:
        res = AgentRunner.run_streamed(
            self.synthesis_agent,
            input=query,
            context=context,
            name=AgentToolName.ANSWER_REFORMULATE
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

        final_answer = await self._postprocess_answer(final_answer, context)

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
