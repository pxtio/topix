"""Unit tests for chat message reasoning formatting."""

from topix.agents.datatypes.outputs import CreateNoteOutput, WebSearchOutput
from topix.agents.datatypes.tool_call import MAX_ARGUMENTS_LENGTH, ToolCall
from topix.agents.datatypes.tools import AgentToolName
from topix.datatypes.chat.chat import Message, MessageProperties
from topix.datatypes.property import ReasoningProperty, TextProperty
from topix.datatypes.resource import RichText


def test_tool_call_to_compact_step_description_formats_arguments():
    """Tool calls should render as a compact name-plus-args string."""
    step = ToolCall(
        id="step-1",
        name=AgentToolName.WEB_SEARCH,
        output=WebSearchOutput(search_results=[]),
        arguments={"query": "best pizza paris", "scope": "fresh"},
    )

    assert (
        step.to_compact_step_description()
        == "web_search({ query: 'best pizza paris', scope: 'fresh' })"
    )


def test_tool_call_to_compact_step_description_truncates_long_arguments():
    """Tool call formatting should cap very long argument strings."""
    long_query = "x" * (MAX_ARGUMENTS_LENGTH + 50)
    step = ToolCall(
        id="step-2",
        name=AgentToolName.WEB_SEARCH,
        output=WebSearchOutput(search_results=[]),
        arguments={"query": long_query},
    )

    result = step.to_compact_step_description()

    assert result.startswith("web_search({ ")
    assert result.endswith("... })")


def test_message_to_chat_message_includes_reasoning_and_content():
    """Assistant messages should prepend compact reasoning before the content body."""
    step = ToolCall(
        id="step-3",
        name=AgentToolName.CREATE_NOTE,
        output=CreateNoteOutput(
            note_id="note-1",
            graph_uid="graph-1",
            label="Ideas",
            note_type="rectangle",
        ),
        arguments={"content": "Key idea", "label": "Ideas"},
    )
    message = Message(
        role="assistant",
        content=RichText(markdown="Final answer body"),
        properties=MessageProperties(
            reasoning=ReasoningProperty(reasoning=[step]),
        ),
    )

    chat_message = message.to_chat_message()

    assert chat_message["role"] == "assistant"
    assert chat_message["content"].startswith("<Reasoning>\n\ncreate_note(")
    assert "Final answer body" in chat_message["content"]


def test_user_message_to_chat_message_keeps_context_prefix():
    """User messages should keep message context ahead of reasoning and content."""
    step = ToolCall(
        id="step-4",
        name=AgentToolName.EDIT_NOTE,
        output=CreateNoteOutput(
            note_id="note-2",
            graph_uid="graph-1",
            label="Renamed",
            note_type="rectangle",
        ),
        arguments={"note_id": "note-2"},
    )
    message = Message(
        role="user",
        content=RichText(markdown="Please update this note"),
        properties=MessageProperties(
            reasoning=ReasoningProperty(reasoning=[step]),
            context=TextProperty(text="Current board is roadmap"),
        ),
    )

    chat_message = message.to_chat_message()

    assert chat_message["content"].startswith("<MessageContext>")
    assert "Current board is roadmap" in chat_message["content"]
    assert "<Reasoning>" in chat_message["content"]
    assert "Please update this note" in chat_message["content"]
