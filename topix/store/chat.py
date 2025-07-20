from topix.datatypes.chat.chat import Chat
from topix.store.postgres.chat import (
    _dangerous_hard_delete_chat_by_uid,
    create_chat,
    delete_chat_by_uid,
    get_chat_by_uid,
    list_chats_by_user_uid,
    update_chat_by_uid,
)
from topix.store.postgres.pool import create_pool


class ChatStore:
    """Store for chat messages."""

    def __init__(self):
        """Initialize the chat store."""
        self._pg_pool = create_pool()

    async def open(self):
        """Open the database connection pool."""
        await self._pg_pool.open()

    async def create_chat(self, chat: Chat):
        """Create a new chat."""
        async with self._pg_pool.connection() as conn:
            await create_chat(conn, chat)

    async def get_chat(self, chat_uid: str) -> Chat | None:
        """Retrieve a chat by its UID."""
        async with self._pg_pool.connection() as conn:
            return await get_chat_by_uid(conn, chat_uid)

    async def update_chat(self, chat_uid: str, data: dict):
        """Update a chat's information."""
        async with self._pg_pool.connection() as conn:
            await update_chat_by_uid(conn, chat_uid, data)

    async def delete_chat(self, chat_uid: str, hard_delete: bool = False):
        """Delete a chat by its UID."""
        async with self._pg_pool.connection() as conn:
            if hard_delete:
                await _dangerous_hard_delete_chat_by_uid(conn, chat_uid)
            else:
                await delete_chat_by_uid(conn, chat_uid)

    async def list_chats(self, user_uid: str) -> list[Chat]:
        """List all chats for a user."""
        async with self._pg_pool.connection() as conn:
            return await list_chats_by_user_uid(conn, user_uid)

    async def close(self):
        """Close the database connection pool."""
        await self._pg_pool.close()
