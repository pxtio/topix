"""Tests for tool handler streaming output behavior."""

import pytest

from topix.agents.datatypes.context import Context
from topix.agents.datatypes.outputs import CodeInterpreterOutput
from topix.agents.datatypes.stream import AgentStreamMessage
from topix.agents.datatypes.tool_call import ToolCall
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.tool_handler import ToolHandler


@pytest.mark.asyncio
async def test_log_output_skips_tool_call_for_raw_message():
    """RAW_MESSAGE runs should only emit a stop event, not a synthetic ToolCall."""
    context = Context()

    await ToolHandler.log_output(
        context=context,
        tool_name=AgentToolName.RAW_MESSAGE,
        tool_id="raw-1",
        input="hello",
        output=CodeInterpreterOutput(status="success", duration_ms=10),
    )

    queued = []
    while not context._message_queue.empty():
        queued.append(await context._message_queue.get())

    assert context.tool_calls == []
    assert len(queued) == 1
    assert isinstance(queued[0], AgentStreamMessage)
    assert queued[0].tool_name == AgentToolName.RAW_MESSAGE
    assert queued[0].is_stop is True


@pytest.mark.asyncio
async def test_log_output_keeps_tool_call_for_real_tool():
    """Real tools should still append a ToolCall before the final stop event."""
    context = Context()

    await ToolHandler.log_output(
        context=context,
        tool_name=AgentToolName.MEMORY_SEARCH,
        tool_id="tool-1",
        input={"query": "inflation"},
        output=CodeInterpreterOutput(status="success", duration_ms=10),
    )

    queued = []
    while not context._message_queue.empty():
        queued.append(await context._message_queue.get())

    assert len(context.tool_calls) == 1
    assert isinstance(queued[0], ToolCall)
    assert queued[0].id == "tool-1"
    assert isinstance(queued[1], AgentStreamMessage)
    assert queued[1].is_stop is True
