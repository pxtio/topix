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
    Content,
    ContentType,
)
from topix.agents.datatypes.tool_call import ToolCall, ToolCallState
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.run import AgentRunner
from topix.agents.sessions import AssistantSession
from topix.datatypes.chat.chat import Message
from topix.datatypes.property import ReasoningProperty
from topix.datatypes.resource import RichText
from topix.store.qdrant.store import ContentStore
from topix.utils.common import gen_uid
from topix.utils.web.favicon import fetch_meta_images_batch

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

    async def _convert_tool_call_to_annotation_message(
        self, tool_call: ToolCall
    ) -> AgentStreamMessage | None:
        if tool_call.name not in [
            AgentToolName.WEB_SEARCH,
            AgentToolName.MEMORY_SEARCH,
        ]:
            return None

        annotations = []
        match tool_call.name:
            case AgentToolName.WEB_SEARCH:
                # Fetch favicons and cover images for the search results
                search_results = tool_call.output.search_results
                meta_images = await fetch_meta_images_batch(
                    [result.url for result in search_results]
                )
                for result in search_results:
                    if result.url in meta_images:
                        result.favicon = (
                            str(meta_images[result.url].favicon)
                            if meta_images[result.url].favicon
                            else None
                        )
                        result.cover_image = (
                            str(meta_images[result.url].cover_image)
                            if meta_images[result.url].cover_image
                            else None
                        )
                annotations = search_results
            case AgentToolName.MEMORY_SEARCH:
                annotations = tool_call.output.references

        return AgentStreamMessage(
            tool_id=tool_call.id,
            tool_name=tool_call.name,
            content=Content(annotations=annotations),
        )

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

        plan_message = ""
        plan_id = None

        steps = context.tool_calls

        async for message in res:
            if isinstance(message, AgentStreamMessage):
                if message.content and message.content.type in [
                    ContentType.MESSAGE,
                    ContentType.TOKEN,
                ]:
                    if message.tool_name == AgentToolName.RAW_MESSAGE:
                        plan_message += message.content.text
                        plan_id = message.tool_id
                yield message
            elif isinstance(message, ToolCall):
                annotation_message = await self._convert_tool_call_to_annotation_message(  # noqa: E501
                    message
                )
                if annotation_message is not None:
                    yield annotation_message

        # Launch the synthesis agent:
        res = AgentRunner.run_streamed(
            self.synthesis_agent, input=query, context=context
        )

        final_answer = ""
        async for message in res:
            if isinstance(message, AgentStreamMessage):
                if message.content and message.content.type in [
                    ContentType.MESSAGE,
                    ContentType.TOKEN,
                ]:
                    final_answer += message.content.text
                yield message

        steps.append(
            ToolCall(
                id=plan_id,
                name=AgentToolName.RAW_MESSAGE,
                output=plan_message,
                state=ToolCallState.COMPLETED,
            )
        )

        if session:
            if not steps:
                raise Exception("No steps created during streaming!")

            await session.add_items(
                [
                    Message(
                        role="assistant",
                        content=RichText(markdown=final_answer),
                        properties={
                            "reasoning": ReasoningProperty(
                                reasoning=[
                                    step.model_dump(exclude_none=True) for step in steps
                                ]
                            )
                        },
                    )
                ]
            )

    @staticmethod
    def _is_response(message: str | AgentStreamMessage) -> bool:
        """Check if the message is a response."""
        return isinstance(message, AgentStreamMessage) and (
            message.content
            and message.content.type in [ContentType.MESSAGE, ContentType.TOKEN]
        )
