from pydantic import BaseModel

from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note


class SendMessageRequest(BaseModel):
    """Request model for sending a message to a chat."""

    query: str


class ChatUpdateRequest(BaseModel):
    """Request model for updating a chat."""

    data: dict


class GraphUpdateRequest(BaseModel):
    """Request model for updating a graph."""

    data: dict


class AddNotesRequest(BaseModel):
    """Request model for adding notes to a graph."""

    notes: list[Note]


class AddLinksRequest(BaseModel):
    """Request model for adding links to a graph."""

    links: list[Link]
