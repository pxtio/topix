"""Chat API Router."""

import logging

from typing import Annotated

from fastapi import APIRouter, Body, Request, Response
from fastapi.params import Path, Query

from src.agents.assistant.manager import AssistantManager
from src.agents.assistant.plan import Plan
from src.agents.assistant.query_rewrite import QueryRewrite
from src.agents.datatypes.context import ReasoningContext
from src.agents.describe_chat import DescribeChat
from src.agents.run import AgentRunner
from src.agents.sessions import AssistantSession
from src.api.datatypes.requests import ChatUpdateRequest, MessageUpdateRequest, SendMessageRequest
from src.api.helpers import with_standard_response, with_streaming
from src.datatypes.chat.chat import Chat
from src.store.chat import ChatStore

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/chats",
    tags=["chats"],
    responses={404: {"description": "Not found"}},
)


@router.put("/", include_in_schema=False)
@router.put("")
@with_standard_response
async def create_chat(
    response: Response,
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")],
    board_id: Annotated[str, Query(description="Board Unique ID")] = None
):
    """Create a new chat for the user."""
    new_chat = Chat(user_uid=user_id, graph_uid=board_id)

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
    store: ChatStore = request.app.chat_store
    session = AssistantSession(session_id=chat_id, chat_store=store)

    chat_describer = DescribeChat()
    label = await AgentRunner.run(chat_describer, await session.get_items())

    await store.update_chat(chat_id, {"label": label})
    return {"label": label}


@router.patch("/{chat_id}/", include_in_schema=False)
@router.patch("/{chat_id}")
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
    return await request.app.chat_store.delete_chat(chat_id, hard_delete=True)


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
    chat_store: ChatStore = request.app.chat_store
    session = AssistantSession(session_id=chat_id, chat_store=chat_store)

    assistant = AssistantManager(
        QueryRewrite(),
        Plan(
            model=body.model,
            search_choice=body.web_search_engine
        ))
    if body.activated_tool:
        assistant.plan_agent.activate_tool(body.activated_tool)

    try:
        async for data in assistant.run_streamed(
            query=body.query,
            context=ReasoningContext(),
            session=session,
            message_id=body.message_id
        ):
            yield data

        # After streaming, update the chat's updated_at timestamp
        await chat_store.update_chat(chat_id, {})
    except Exception as e:
        # Handle any exceptions that occur during streaming
        logger.error(
            "Error while sending message in chat %s: %s",
            chat_id,
            str(e),
            exc_info=True
        )
        return


@router.patch("/{chat_id}/messages/{message_id}/", include_in_schema=False)
@router.patch("/{chat_id}/messages/{message_id}")
@with_standard_response
async def update_message(
    response: Response,
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    message_id: Annotated[str, Path(description="Message ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[MessageUpdateRequest, Body(description="Message update data")]
):
    """Update a message in a chat."""
    chat_store: ChatStore = request.app.chat_store
    await chat_store.update_message(message_id, body.data)
    return {"message": "Message updated successfully"}


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
    chat_store: ChatStore = request.app.chat_store
    messages = await chat_store.get_messages(chat_uid=chat_id)
    return {"messages": [msg.model_dump(exclude_none=True) for msg in messages]}
