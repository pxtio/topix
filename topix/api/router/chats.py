"""Chat API Router."""

from typing import Annotated

from fastapi import APIRouter, Body, Request, Response
from fastapi.params import Path, Query

from topix.agents.assistant import AssistantManager
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.describe_chat import DescribeChat
from topix.agents.sessions import AssistantSession
from topix.api.datatypes.requests import ChatUpdateRequest, SendMessageRequest
from topix.api.helpers import with_standard_response, with_streaming
from topix.datatypes.chat.chat import Chat
from topix.store.chat import ChatStore
from topix.store.qdrant.store import ContentStore

router = APIRouter(
    prefix="/chats",
    tags=["chats"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", include_in_schema=False)
@router.put("")
@with_standard_response
async def create_chat(
    response: Response,
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Create a new chat for the user."""
    new_chat = Chat(user_uid=user_id)

    store: ChatStore = request.app.chat_store
    await store.create_chat(new_chat)
    return {"chat_id": new_chat.uid}


@router.post("/{chat_id}:describe/", include_in_schema=False)
@router.post("/{chat_id}:describe")
@with_standard_response
async def describe_chat(
    response: Response,
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Describe a chat by its ID."""
    content_store: ContentStore = request.app.content_store
    session = AssistantSession(session_id=chat_id, content_store=content_store)

    chat_describer = DescribeChat()
    label = await chat_describer.run(await session.get_items())

    store: ChatStore = request.app.chat_store
    await store.update_chat(chat_id, {"label": label})
    return {"label": label}


@router.post("/{chat_id}/", include_in_schema=False)
@router.post("/{chat_id}")
@with_standard_response
async def update_chat(
    response: Response,
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[ChatUpdateRequest, Body(description="Chat update data")]
):
    """Update an existing chat by its ID."""
    store: ChatStore = request.app.chat_store
    return await store.update_chat(chat_id, body.data)


@router.get("/{chat_id}/", include_in_schema=False)
@router.get("/{chat_id}")
@with_standard_response
async def get_chat(
    response: Response,
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Get a chat by its ID."""
    store: ChatStore = request.app.chat_store
    chat = await store.get_chat(chat_id)
    return {"chat": chat.model_dump(exclude_none=True)}


@router.get("/", include_in_schema=False)
@router.get("")
@with_standard_response
async def list_chats(
    response: Response,
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """List all chats for the user."""
    store: ChatStore = request.app.chat_store
    return {"chats": await store.list_chats(user_uid=user_id)}


@router.delete("/{chat_id}/", include_in_schema=False)
@router.delete("/{chat_id}")
@with_standard_response
async def delete_chat(
    response: Response,
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Delete a chat by its ID."""
    return await request.app.chat_store.delete_chat(chat_id)


@router.post("/{chat_id}/messages/", include_in_schema=False)
@router.post("/{chat_id}/messages")
@with_streaming
async def send_message(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[SendMessageRequest, Body(description="Message content")]
):
    """Send a message to a chat."""
    session = AssistantSession(session_id=chat_id, content_store=request.app.content_store)
    assistant = AssistantManager()
    async for data in assistant.stream(
        query=body.query,
        context=ReasoningContext(),
        session=session
    ):
        yield data

    # After streaming, update the chat's updated_at timestamp
    chat_store: ChatStore = request.app.chat_store
    await chat_store.update_chat(chat_id, {})


@router.get("/{chat_id}/messages/", include_in_schema=False)
@router.get("/{chat_id}/messages")
@with_standard_response
async def list_messages(
    response: Response,
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """List all messages in a chat."""
    session = AssistantSession(session_id=chat_id, content_store=request.app.content_store)

    return {"messages": await session.get_items()}
