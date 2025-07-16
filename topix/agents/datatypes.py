"""Agent datatypes."""

import asyncio

from pydantic import BaseModel, PrivateAttr

from topix.datatypes.enum import CustomEnum


class AgentToolName(str, CustomEnum):
    """Enumeration for tool names used in the agent manager."""

    ANSWER_REFORMULATE = "answer_reformulate"
    KNOWLEDGE_BASE_SEARCH = "knowledge_base_search"
    WEB_SEARCH = "web_search"
    RAW_MESSAGE = "raw_message"


class StreamMessageType(str, CustomEnum):
    """Enumeration for token message types."""

    TOKEN = "token"
    STATE = "state"


class ToolExecutionState(str, CustomEnum):
    """Enumeration for tool call states."""

    STARTED = "started"
    COMPLETED = "completed"
    FAILED = "failed"


class StreamDelta(BaseModel):
    """Stream delta for token streaming."""

    content: str


class AgentStreamMessage(BaseModel):
    """Agent stream message for streaming results."""

    type: StreamMessageType = StreamMessageType.TOKEN

    tool_id: str
    tool_name: AgentToolName

    execution_state: ToolExecutionState | None = None
    status_message: str | None = None
    delta: StreamDelta | None = None


class Context(BaseModel):
    """Agent context for managing state and results."""

    search_results_limit: int = 5

    kb_search_results: list[str] = []
    web_search_results: list[str] = []

    _message_queue: asyncio.Queue = PrivateAttr(default_factory=asyncio.Queue)
