"""API Request Models."""

from typing import Literal

from pydantic import BaseModel

from topix.agents.datatypes.tools import AgentToolName
from topix.agents.datatypes.web_search import WebSearchOption
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note


class SendMessageRequest(BaseModel):
    """Request model for sending a message to a chat."""

    message_id: str | None = None
    query: str
    model: str = "openai/gpt-4o"
    web_search_engine: WebSearchOption = WebSearchOption.OPENAI
    force_tool: AgentToolName | None = None

    enabled_tools: list[AgentToolName] = [
        AgentToolName.WEB_SEARCH,
        AgentToolName.MEMORY_SEARCH,
        AgentToolName.CODE_INTERPRETER
    ]
    reasoning_effort: Literal["low", "medium", "high"] | None = None


class ChatUpdateRequest(BaseModel):
    """Request model for updating a chat."""

    data: dict


class MessageUpdateRequest(BaseModel):
    """Request model for updating a message."""

    data: dict


class GraphUpdateRequest(BaseModel):
    """Request model for updating a graph."""

    data: dict


class NoteUpdateRequest(BaseModel):
    """Request model for updating a note."""

    data: dict


class LinkUpdateRequest(BaseModel):
    """Request model for updating a link."""

    data: dict


class AddNotesRequest(BaseModel):
    """Request model for adding notes to a graph."""

    notes: list[Note]


class AddLinksRequest(BaseModel):
    """Request model for adding links to a graph."""

    links: list[Link]


class ConvertToMindMapRequest(BaseModel):
    """Request model for converting a graph to a mind map."""

    answer: str


class WebPagePreviewRequest(BaseModel):
    """Request model for fetching a preview of a webpage."""

    url: str
