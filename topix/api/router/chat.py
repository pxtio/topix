"""Chat API Router."""

from typing import Annotated

from fastapi import APIRouter, Request
from fastapi.params import Path, Query

router = APIRouter(
    prefix="/chats",
    tags=["chats"],
    responses={404: {"description": "Not found"}},
)


@router.put("")
def create_chat(
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Create a new chat for the user."""
    pass


@router.post("/{chat_id}:describe")
def describe_chat(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Describe a chat by its ID."""
    pass


@router.post("/{chat_id}")
def update_chat(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Update an existing chat by its ID."""
    pass


@router.get("/{chat_id}")
def get_chat(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Get a chat by its ID."""
    pass


@router.get("/")
def list_chats(
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """List all chats for the user."""
    pass


@router.delete("/{chat_id}")
def delete_chat(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Delete a chat by its ID."""
    pass


@router.post("/{chat_id}/messages")
def send_message(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Send a message to a chat."""
    pass


@router.get("/{chat_id}/messages")
def list_message_queue(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """List all messages in a chat."""
    pass


@router.get("/{chat_id}/messages/{message_id}")
def get_message(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    message_id: Annotated[str, Path(description="Message ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Get a specific message by its ID in a chat."""
    pass
