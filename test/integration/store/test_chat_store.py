import pytest

from topix.datatypes.chat.chat import Chat
from topix.store.chat import ChatStore


@pytest.mark.asyncio
async def test_chatstore_crud_flow(config):
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

        # ---- SOFT DELETE ----
        await store.delete_chat(chat.uid, hard_delete=False)
        result_soft = await store.get_chat(chat.uid)
        assert result_soft is not None
        assert result_soft.deleted_at is not None

        # ---- HARD DELETE ----
        await store.delete_chat(chat2.uid, hard_delete=True)
        result_hard = await store.get_chat(chat2.uid)
        assert result_hard is None

    finally:
        await store.close()
