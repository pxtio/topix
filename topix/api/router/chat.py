"""Chat API Router."""

from typing import Annotated

from fastapi import APIRouter, Request
from fastapi.params import Path, Query

from topix.agents.describe_chat import DescribeChat
from topix.agents.sessions import AssistantSession
from topix.api.helpers import format_response
from topix.datatypes.chat.chat import Chat
from topix.store.chat import ChatStore

router = APIRouter(
    prefix="/chats",
    tags=["chats"],
    responses={404: {"description": "Not found"}},
)


@router.put("")
async def create_chat(
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Create a new chat for the user."""
    new_chat = Chat(user_uid=user_id)
    return await format_response(request.app.chat_store.create_chat, new_chat)


@router.post("/{chat_id}:describe")
async def describe_chat(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Describe a chat by its ID."""
    session = AssistantSession(session_id=chat_id, content_store=request.app.content_store)

    async def describe_chat():
        """Describe the chat using the DescribeChat agent."""
        chat_describer = DescribeChat()
        title = await chat_describer.run(await session.get_items())

        store: ChatStore = request.app.chat_store
        store.update_chat(chat_id, {"label": title})
        return {"title": title}

    return await format_response(describe_chat)


@router.post("/{chat_id}")
def update_chat(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Update an existing chat by its ID."""
    pass


@router.get("/{chat_id}")
async def get_chat(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Get a chat by its ID."""
    pass


@router.get("/")
async def list_chats(
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """List all chats for the user."""
    return await format_response(request.app.chat_store.list_chats, user_id)


@router.delete("/{chat_id}")
async def delete_chat(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Delete a chat by its ID."""
    return await format_response(request.app.chat_store.delete_chat, chat_id)


@router.post("/{chat_id}/messages")
async def send_message(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Send a message to a chat."""
    pass


@router.get("/{chat_id}/messages")
async def list_messages(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """List all messages in a chat."""
    session = AssistantSession(session_id=chat_id, content_store=request.app.content_store)
    return await format_response(session.get_items)
