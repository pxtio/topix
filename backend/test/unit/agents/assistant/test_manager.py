"""Unit tests for the single-stage assistant manager flow."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import pytest

from topix.agents.assistant.manager import AssistantManager
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.outputs import WebSearchOutput
from topix.agents.datatypes.reasoning_step import ReasoningStep
from topix.agents.datatypes.stream import (
    AgentStreamMessage,
    Content,
    ContentType,
    StreamingMessageType,
)
from topix.agents.datatypes.tool_call import ToolCall, ToolCallState
from topix.agents.datatypes.tools import AgentToolName
from topix.datatypes.chat.chat import Message


class RecordingSession:
    """Minimal chat session test double for assistant manager tests."""

    def __init__(self):
        """Init method."""
        self.items: list[Message | dict] = []

    async def get_items(self) -> list[dict[str, str]]:
        """Return no prior history for the test session."""
        return []

    async def add_items(self, items: list[Message | dict]) -> None:
        """Record persisted messages for later assertions."""
        self.items.extend(items)


@pytest.mark.asyncio
async def test_run_streamed_persists_assistant_message_without_tool_calls(monkeypatch: pytest.MonkeyPatch):
    """Streaming should save the final assistant text even if no tool call completed."""
    manager = AssistantManager(plan_agent=object())
    session = RecordingSession()

    async def fake_run_streamed(
        starting_agent: object,
        input: object,
        context: ReasoningContext,
        max_turns: int = 8,
        name: str = "raw_message",
    ) -> AsyncGenerator[AgentStreamMessage, None]:
        yield AgentStreamMessage(
            type=StreamingMessageType.STREAM_REASONING_MESSAGE,
            tool_id="tool-1",
            tool_name=name,
            content=Content(type=ContentType.TOKEN, text="Thinking..."),
            is_stop=False,
        )
        yield AgentStreamMessage(
            type=StreamingMessageType.STREAM_MESSAGE,
            tool_id="tool-1",
            tool_name=name,
            content=Content(type=ContentType.TOKEN, text="Hello "),
            is_stop=False,
        )
        yield AgentStreamMessage(
            type=StreamingMessageType.STREAM_MESSAGE,
            tool_id="tool-1",
            tool_name=name,
            content=Content(type=ContentType.TOKEN, text="world"),
            is_stop=False,
        )
        yield AgentStreamMessage(
            type=StreamingMessageType.STREAM_MESSAGE,
            tool_id="tool-1",
            tool_name=name,
            content=Content(type=ContentType.STATUS, text=""),
            is_stop=True,
        )

    async def passthrough_postprocess(answer: str, context: ReasoningContext) -> str:
        return answer

    monkeypatch.setattr("topix.agents.assistant.manager.AgentRunner.run_streamed", fake_run_streamed)
    monkeypatch.setattr(manager, "_postprocess_answer", passthrough_postprocess)

    collected = []
    async for message in manager.run_streamed(
        context=ReasoningContext(),
        query="Say hello",
        session=session,
    ):
        collected.append(message)

    assert len(collected) == 4
    assert len(session.items) == 2
    assert isinstance(session.items[1], Message)
    assert session.items[1].content.markdown == "Hello world"
    steps = session.items[1].properties.reasoning.reasoning
    assert len(steps) == 1
    assert isinstance(steps[0], ReasoningStep)
    assert steps[0].reasoning == "Thinking..."
    assert steps[0].message == "Hello world"


@pytest.mark.asyncio
async def test_run_streamed_flushes_reasoning_step_before_tool_call(monkeypatch: pytest.MonkeyPatch):
    """Buffered assistant text should flush into a step before a tool call is appended."""
    manager = AssistantManager(plan_agent=object())
    session = RecordingSession()
    tool_call = ToolCall(
        id="tool-search",
        name=AgentToolName.WEB_SEARCH,
        output=WebSearchOutput(search_results=[]),
        arguments={"query": "latest inflation france"},
        state=ToolCallState.COMPLETED,
    )

    async def fake_run_streamed(
        starting_agent: object,
        input: object,
        context: ReasoningContext,
        max_turns: int = 8,
        name: str = "raw_message",
    ) -> AsyncGenerator[AgentStreamMessage | ToolCall, None]:
        yield AgentStreamMessage(
            type=StreamingMessageType.STREAM_REASONING_MESSAGE,
            tool_id="raw-1",
            tool_name=name,
            content=Content(type=ContentType.TOKEN, text="Need one search."),
            is_stop=False,
        )
        yield AgentStreamMessage(
            type=StreamingMessageType.STREAM_MESSAGE,
            tool_id="raw-1",
            tool_name=name,
            content=Content(type=ContentType.TOKEN, text="Checking inflation. "),
            is_stop=False,
        )
        yield tool_call
        yield AgentStreamMessage(
            type=StreamingMessageType.STREAM_MESSAGE,
            tool_id="raw-1",
            tool_name=name,
            content=Content(type=ContentType.TOKEN, text="Inflation slowed."),
            is_stop=False,
        )
        yield AgentStreamMessage(
            type=StreamingMessageType.STREAM_MESSAGE,
            tool_id="raw-1",
            tool_name=name,
            content=Content(type=ContentType.STATUS, text=""),
            is_stop=True,
        )

    async def passthrough_postprocess(answer: str, context: ReasoningContext) -> str:
        return answer

    monkeypatch.setattr("topix.agents.assistant.manager.AgentRunner.run_streamed", fake_run_streamed)
    monkeypatch.setattr(manager, "_postprocess_answer", passthrough_postprocess)

    collected = []
    async for message in manager.run_streamed(
        context=ReasoningContext(),
        query="What is inflation doing?",
        session=session,
    ):
        collected.append(message)

    assert any(isinstance(item, ToolCall) for item in collected)
    saved_message = session.items[1]
    assert isinstance(saved_message, Message)
    assert saved_message.content.markdown == "Checking inflation. Inflation slowed."

    steps = saved_message.properties.reasoning.reasoning
    assert len(steps) == 3
    assert isinstance(steps[0], ReasoningStep)
    assert steps[0].id == "raw-1:0"
    assert steps[0].reasoning == "Need one search."
    assert steps[0].message == "Checking inflation. "
    assert isinstance(steps[1], ToolCall)
    assert steps[1].id == "tool-search"
    assert isinstance(steps[2], ReasoningStep)
    assert steps[2].id == "raw-1:1"
    assert steps[2].message == "Inflation slowed."
