"""Integration tests for the ChatStore class."""
import pytest

from topix.datatypes.chat.chat import Chat
from topix.store.chat import ChatStore
from topix.utils.common import gen_uid


@pytest.fixture
def messages():
    """Fixture to provide sample messages."""
    return [
        {"id": gen_uid(), "role": "user", "content": "Hello!"},
        {"id": gen_uid(), "role": "assistant", "content": "Hi there! How can I help you?"},
        {"id": gen_uid(), "role": "user", "content": "Tell me a joke."},
        {"id": gen_uid(), "role": "assistant", "content": "Why did the chicken cross the road? To get to the other side!"}
    ]


@pytest.mark.asyncio
async def test_chatstore_crud_flow(config, messages):
    """Test the CRUD operations of the ChatStore."""
    store = ChatStore()
    await store.open()
    try:
        # ---- CREATE and GET ----
        user_uid = "root"
        chat = Chat(label="Test Chat", user_uid=user_uid)
        await store.create_chat(chat)

        fetched = await store.get_chat(chat.uid)
        assert fetched is not None
        assert fetched.uid == chat.uid
        assert fetched.label == "Test Chat"
        assert fetched.user_uid == user_uid

        # ---- UPDATE ----
        await store.update_chat(chat.uid, {"label": "Updated Chat!"})
        updated = await store.get_chat(chat.uid)
        assert updated.label == "Updated Chat!"

        # ---- LIST ----
        chat2 = Chat(label="Second Chat", user_uid=user_uid)
        await store.create_chat(chat2)
        chats = await store.list_chats(user_uid)
        assert any(c.uid == chat.uid and c.label == "Updated Chat!" for c in chats)
        assert any(c.uid == chat2.uid and c.label == "Second Chat" for c in chats)
        assert len([c for c in chats if c.user_uid == user_uid]) >= 2

        # ---- ADD MESSAGES ----
        await store.add_messages(chat.uid, messages)
        messages_list = await store.get_messages(chat.uid)
        assert len(messages_list) == 4
        assert messages_list[0].role == "user"
        assert messages_list[1].role == "assistant"
        assert messages_list[2].role == "user"
        assert messages_list[3].role == "assistant"

        # ---- POP MESSAGE ----
        popped_message = await store.pop_message(chat.uid)
        assert popped_message is not None
        assert popped_message.role == "assistant"  # Last message should be popped

        # ---- SOFT DELETE ----
        await store.delete_chat(chat.uid, hard_delete=False)
        result_soft = await store.get_chat(chat.uid)
        assert result_soft is not None
        assert result_soft.deleted_at is not None

        # ---- HARD DELETE ----
        await store.delete_chat(chat2.uid, hard_delete=True)
        result_hard = await store.get_chat(chat2.uid)
        assert result_hard is None
        # Ensure messages are also deleted
        messages_after_hard_delete = await store.get_messages(chat2.uid)
        assert len(messages_after_hard_delete) == 0

    finally:
        await store.close()
