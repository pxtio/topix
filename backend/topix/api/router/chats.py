"""Chat API Router."""

import logging

from typing import Annotated

from fastapi import APIRouter, Body, Depends, Request, Response
from fastapi.params import Path, Query

from topix.agents.assistant.manager import AssistantManager
from topix.agents.config import AssistantManagerConfig
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.describe_chat import DescribeChat
from topix.agents.run import AgentRunner
from topix.agents.sessions import AssistantSession
from topix.api.datatypes.requests import (
    ChatUpdateRequest,
    MessageUpdateRequest,
    SendMessageRequest,
)
from topix.api.helpers import with_standard_response, with_streaming
from topix.api.utils.security import get_current_user_uid, verify_chat_user
from topix.datatypes.chat.chat import Chat
from topix.store.chat import ChatStore

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
    user_id: Annotated[str, Depends(get_current_user_uid)],
    board_id: Annotated[str, Query(description="Board Unique ID")] = None,
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
    _: Annotated[None, Depends(verify_chat_user)],
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
    body: Annotated[ChatUpdateRequest, Body(description="Chat update data")],
    _: Annotated[None, Depends(verify_chat_user)]
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
    _: Annotated[None, Depends(verify_chat_user)],
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
    user_id: Annotated[str, Depends(get_current_user_uid)]
):
    """List all chats for the user."""
    store: ChatStore = request.app.chat_store
    chats = await store.list_chats(user_uid=user_id)
    return {"chats": [chat.model_dump(exclude_none=True) for chat in chats]}


@router.delete("/{chat_id}/", include_in_schema=False)
@router.delete("/{chat_id}")
@with_standard_response
async def delete_chat(
    response: Response,
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    _: Annotated[None, Depends(verify_chat_user)],
):
    """Delete a chat by its ID."""
    return await request.app.chat_store.delete_chat(chat_id, hard_delete=True)


@router.post("/{chat_id}/messages/", include_in_schema=False)
@router.post("/{chat_id}/messages")
@with_streaming
async def send_message(
    request: Request,
    chat_id: Annotated[str, Path(description="Chat ID")],
    body: Annotated[SendMessageRequest, Body(description="Message content")],
    _: Annotated[None, Depends(verify_chat_user)]
):
    """Send a message to a chat."""
    chat_store: ChatStore = request.app.chat_store
    session = AssistantSession(session_id=chat_id, chat_store=chat_store)

    assistant_config = AssistantManagerConfig.from_yaml()
    assistant_config.set_model(body.model)
    assistant_config.set_web_engine(body.web_search_engine)
    assistant_config.set_reasoning(body.reasoning_effort)

    assistant: AssistantManager = AssistantManager.from_config(
        content_store=chat_store._content_store,
        config=assistant_config
    )

    assistant.plan_agent.set_enabled_tools(body.enabled_tools)
    if body.force_tool:
        assistant.plan_agent.force_tool(body.force_tool)

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
    body: Annotated[MessageUpdateRequest, Body(description="Message update data")],
    _: Annotated[None, Depends(verify_chat_user)],
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
    _: Annotated[None, Depends(verify_chat_user)],
):
    """List all messages in a chat."""
    chat_store: ChatStore = request.app.chat_store
    messages = await chat_store.get_messages(chat_uid=chat_id)
    return {"messages": [msg.model_dump(exclude_none=True) for msg in messages]}
