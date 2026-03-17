"""Main agent manager."""
from __future__ import annotations

import logging
import re

from collections.abc import AsyncGenerator

from topix.agents.assistant.plan import Plan
from topix.agents.config import AssistantManagerConfig
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.reasoning_step import ReasoningStep
from topix.agents.datatypes.stream import (
    AgentStreamMessage,
    ContentType,
    StreamingMessageType,
)
from topix.agents.datatypes.tool_call import ToolCall
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.run import AgentRunner
from topix.agents.sessions import AssistantSession
from topix.agents.utils.text import post_process_url_citations
from topix.datatypes.chat.chat import Message
from topix.datatypes.property import ReasoningProperty, TextProperty
from topix.datatypes.resource import RichText
from topix.store.graph import GraphStore
from topix.store.qdrant.store import ContentStore
from topix.utils.common import gen_uid

logger = logging.getLogger(__name__)


class AssistantManager:
    """Orchestrates the full flow: query rewrite, planning, searching ..."""

    def __init__(
        self,
        plan_agent: Plan,
    ):
        """Init method."""
        self.plan_agent = plan_agent

    @classmethod
    def from_config(
        cls,
        content_store: ContentStore,
        config: AssistantManagerConfig,
        memory_filters: dict | None = None,
        graph_store: GraphStore | None = None,
        graph_uid: str | None = None,
        root_id: str | None = None,
    ) -> AssistantManager:
        """Create an instance of AssistantManager from configuration."""
        plan_agent = Plan.from_config(
            content_store,
            config.plan,
            memory_filters=memory_filters,
            graph_store=graph_store,
            graph_uid=graph_uid,
            root_id=root_id,
        )

        return cls(plan_agent)

    async def _compose_input(
        self,
        context: ReasoningContext,
        query: str,
        session: AssistantSession | None = None,
        message_context: str | None = None,
    ) -> list[dict[str, str]]:
        if message_context is not None and message_context.strip() != "":
            query = (
                "<MessageContext>\n\n"
                f"{message_context}\n\n"
                f"</MessageContext>\n\n{query}"
            )
        if session:
            history = await session.get_items()
            if history:
                context.chat_history = history
                return history + [{"role": "user", "content": query}]
            else:
                return [{"role": "user", "content": query}]
        return [{"role": "user", "content": query}]

    async def _postprocess_answer(  # noqa: C901
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

        short_ref_re = re.compile(r"\(/(?P<rtype>[a-z_]+)/(?P<prefix>[a-zA-Z0-9]{4,})\)")

        valid_urls = []
        for tool_call in context.tool_calls:
            if tool_call.name == AgentToolName.WEB_SEARCH:
                search_results = tool_call.output.search_results
                for result in search_results:
                    valid_urls.append(result.url)

            # Correct shortened URLs in the answer by replacing shortened IDs with full IDs
            elif tool_call.name == AgentToolName.MEMORY_SEARCH:
                if graph_uid is not None:
                    refs = tool_call.output.references

                    # Each ref is a full ID; we match on any prefix the model emits.
                    def replace_match(match: re.Match[str]) -> str:
                        # Replace /:type/:prefix with the first matching full ID for that type.
                        rtype = match.group("rtype")
                        prefix = match.group("prefix")
                        found = None

                        for ref in refs:
                            if ref.ref_type != rtype:
                                continue
                            if ref.ref_id.startswith(prefix):
                                found = ref
                                break

                        if not found:
                            return match.group(0)

                        target_type = found.parent_type or found.ref_type
                        target_id = found.parent_id or found.ref_id

                        return f"(/boards/{graph_uid}/{target_type}s/{target_id})"

                    answer = short_ref_re.sub(replace_match, answer)

        return post_process_url_citations(answer, valid_urls)

    async def run(
        self,
        context: ReasoningContext,
        query: str,
        session: AssistantSession | None = None,
        message_id: str | None = None,
        max_turns: int = 5,
        message_context: str | None = None
    ) -> str:
        """Run the assistant agent with the provided context and query."""
        agent_input = await self._compose_input(
            context,
            query,
            session,
            message_context=message_context
        )

        if session:
            user_message = Message(
                id=message_id or gen_uid(),
                role="user",
                content=RichText(markdown=query)
            )
            if message_context is not None and message_context.strip() != "":
                user_message.properties.context = TextProperty(text=message_context)

            await session.add_items([user_message])

        # launch plan:
        res = ""
        try:
            res = await AgentRunner.run(
                self.plan_agent, input=agent_input, context=context, max_turns=max_turns
            )
        except Exception:
            logger.info(f"Max turns exceeded: {max_turns}", exc_info=True)

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
        message_context: str | None = None
    ) -> AsyncGenerator[AgentStreamMessage | ToolCall, str]:
        """Run the assistant agent with the provided context and query.

        If a session is provided, use it to store the user query and retrieve the chat history.
        Otherwise, do not use any chat history.

        Yields:
            AgentStreamMessage: The messages from the agent.

        """
        # Notify the start of the agent stream
        agent_input = await self._compose_input(
            context,
            query,
            session,
            message_context=message_context
        )

        if session:
            user_message = Message(
                id=message_id or gen_uid(),
                role="user",
                content=RichText(markdown=query)
            )
            if message_context is not None and message_context.strip() != "":
                user_message.properties.context = TextProperty(text=message_context)
            await session.add_items([user_message])

        current_message_buffer: list[str] = []
        current_reasoning_buffer: list[str] = []
        persisted_steps: list[ReasoningStep | ToolCall] = []
        current_raw_tool_id: str | None = None
        reasoning_step_index = 0

        def flush_current_buffers() -> None:
            """Flush the current text buffers into one persisted reasoning step."""
            nonlocal reasoning_step_index, current_raw_tool_id

            message = "".join(current_message_buffer)
            reasoning = "".join(current_reasoning_buffer)
            if not message and not reasoning:
                return

            step_prefix = current_raw_tool_id or "raw_message"
            persisted_steps.append(
                ReasoningStep(
                    id=f"{step_prefix}:{reasoning_step_index}",
                    reasoning=reasoning,
                    message=message,
                )
            )
            reasoning_step_index += 1
            current_message_buffer.clear()
            current_reasoning_buffer.clear()

        def build_message_content() -> str:
            """Build the persisted assistant message content from reasoning steps."""
            return "".join(
                step.message for step in persisted_steps
                if isinstance(step, ReasoningStep)
            )

        try:
            res = AgentRunner.run_streamed(
                self.plan_agent, input=agent_input, context=context, max_turns=max_turns
            )

            async for message in res:
                if isinstance(message, ToolCall):
                    flush_current_buffers()
                    persisted_steps.append(message)
                    yield message
                    continue

                if message.tool_name == AgentToolName.RAW_MESSAGE:
                    current_raw_tool_id = message.tool_id
                    if (
                        message.content
                        and message.content.type in [ContentType.MESSAGE, ContentType.TOKEN]
                    ):
                        if message.type == StreamingMessageType.STREAM_MESSAGE:
                            current_message_buffer.append(message.content.text)
                        elif message.type == StreamingMessageType.STREAM_REASONING_MESSAGE:
                            current_reasoning_buffer.append(message.content.text)

                    if message.is_stop:
                        flush_current_buffers()

                yield message
        except Exception as e:
            logger.error(
                f"Plan agent execution error {e}, may due to Max turns exceeded",
                exc_info=True,
            )

        flush_current_buffers()

        final_reasoning_step = next(
            (
                step
                for step in reversed(persisted_steps)
                if isinstance(step, ReasoningStep) and step.message
            ),
            None,
        )
        if final_reasoning_step is not None:
            final_reasoning_step.message = await self._postprocess_answer(
                final_reasoning_step.message,
                context,
            )

        persisted_content = build_message_content()

        if session:
            await session.add_items(
                [
                    Message(
                        role="assistant",
                        content=RichText(markdown=persisted_content),
                        properties={
                            "reasoning": ReasoningProperty(
                                reasoning=persisted_steps
                            )
                        },
                    )
                ]
            )
