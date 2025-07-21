from pydantic import BaseModel


class SendMessageRequest(BaseModel):
    """Request model for sending a message to a chat."""

    query: str


class ChatUpdateRequest(BaseModel):
    """Request model for updating a chat."""

    data: dict
