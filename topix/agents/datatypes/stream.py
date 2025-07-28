"""Agent stream datatypes for token streaming."""
from pydantic import BaseModel

from topix.agents.datatypes.tools import AgentToolName
from topix.datatypes.enum import CustomEnum


class StreamMessageType(str, CustomEnum):
    """Enumeration for token message types."""

    TOKEN = "token"
    STATE = "state"
    CHUNK = "chunk"


class ToolExecutionState(str, CustomEnum):
    """Enumeration for tool call states."""

    STARTED = "started"
    COMPLETED = "completed"
    FAILED = "failed"


class StreamDelta(BaseModel):
    """Token-level update during streaming (e.g., partial token from model)."""
    content: str


class MessageChunk(BaseModel):
    """Chunk of finalized content (e.g., finalized sentence or paragraph)."""
    content: str


class AgentStreamMessage(BaseModel):
    """Agent stream message for streaming results."""

    type: StreamMessageType = StreamMessageType.TOKEN

    tool_id: str
    tool_name: AgentToolName

    execution_state: ToolExecutionState | None = None
    status_message: str | None = None
    delta: StreamDelta | None = None
    chunk: MessageChunk | None = None
