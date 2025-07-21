"""Chat API Router."""

from typing import Annotated

from fastapi import APIRouter, Body, Request
from fastapi.params import Path, Query
from fastapi.responses import StreamingResponse

from topix.agents.assistant import AssistantManager
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.describe_chat import DescribeChat
from topix.agents.sessions import AssistantSession
from topix.api.datatypes.requests import ChatUpdateRequest, SendMessageRequest
from topix.api.helpers import format_response
from topix.datatypes.chat.chat import Chat
from topix.store.chat import ChatStore

router = APIRouter(
    prefix="/chats",
    tags=["chats"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", include_in_schema=False)
@router.put("")
async def create_chat(
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Create a new chat for the user."""
    new_chat = Chat(user_uid=user_id)

    async def create_chat():
        """Create a new chat in the store."""
        store: ChatStore = request.app.chat_store
        await store.create_chat(new_chat)
        return {"chat_id": new_chat.uid}
    return await format_response(create_chat)


@router.post("/{chat_id}:describe/", include_in_schema=False)
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
        await store.update_chat(chat_id, {"label": title})
        return {"title": title}

    return await format_response(describe_chat)


@router.post("/{chat_id}/", include_in_schema=False)
@router.post("/{chat_id}")
async def update_chat(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[ChatUpdateRequest, Body(description="Chat update data")]
):
    """Update an existing chat by its ID."""
    return await format_response(
        request.app.chat_store.update_chat,
        chat_id,
        body.data
    )


@router.get("/{chat_id}/", include_in_schema=False)
@router.get("/{chat_id}")
async def get_chat(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Get a chat by its ID."""
    async def get_chat():
        """Fetch a chat by its ID."""
        store: ChatStore = request.app.chat_store
        chat = await store.get_chat(chat_id)
        return {"chat": chat.model_dump(exclude_none=True)}

    return await format_response(get_chat)


@router.get("/", include_in_schema=False)
@router.get("")
async def list_chats(
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """List all chats for the user."""
    async def list_chats():
        """List all chats for the user."""
        store: ChatStore = request.app.chat_store
        return {"chats": await store.list_chats(user_uid=user_id)}
    return await format_response(list_chats)


@router.delete("/{chat_id}/", include_in_schema=False)
@router.delete("/{chat_id}")
async def delete_chat(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Delete a chat by its ID."""
    return await format_response(request.app.chat_store.delete_chat, chat_id)


@router.post("/{chat_id}/messages/", include_in_schema=False)
@router.post("/{chat_id}/messages")
async def send_message(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[SendMessageRequest, Body(description="Message content")]
):
    """Send a message to a chat."""
    async def stream():
        """Stream messages to the chat."""
        session = AssistantSession(session_id=chat_id, content_store=request.app.content_store)
        assistant = AssistantManager()
        async for data in assistant.stream(
            query=body.query,
            context=ReasoningContext(),
            session=session
        ):
            yield data.model_dump_json(exclude_none=True) + "\n"
        chat_store: ChatStore = request.app.chat_store
        await chat_store.update_chat(chat_id, {})

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.get("/{chat_id}/messages/", include_in_schema=False)
@router.get("/{chat_id}/messages")
async def list_messages(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """List all messages in a chat."""
    session = AssistantSession(session_id=chat_id, content_store=request.app.content_store)

    async def list_messages():
        """List messages in the chat session."""
        return {"messages": await session.get_items()}
    return await format_response(list_messages)
