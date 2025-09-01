"""Assistant session management."""

from agents.memory import Session
from topix.datatypes.chat.chat import Message
from topix.store.chat import ChatStore

MAX_RETRIEVAL_MESSAGES = 20


class AssistantSession(Session):
    """Session for the assistant agent."""

    def __init__(self, session_id: str, chat_store: ChatStore):
        """Init method."""
        self._session_id = session_id
        self._chat_store = chat_store

    async def get_items(self, limit: int = MAX_RETRIEVAL_MESSAGES) -> list[dict]:
        """Get items from the session."""
        messages = await self._chat_store.get_messages(
            chat_uid=self._session_id, limit=limit
        )
        return [msg.to_chat_message() for msg in messages]

    async def add_items(self, items: list[dict | Message]) -> None:
        """Add items to the session."""
        await self._chat_store.add_messages(chat_uid=self._session_id, messages=items)

    async def pop_item(self) -> dict | None:
        """Pop the last item from the session."""
        res = await self._chat_store.pop_message(chat_uid=self._session_id)
        if res:
            return res.to_chat_message()
        return None

    async def clear_session(self) -> None:
        """Clear the session."""
        await self._chat_store.delete_chat(chat_uid=self._session_id, hard_delete=True)
