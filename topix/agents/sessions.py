from agents.memory import Session
from topix.datatypes.chat.chat import Message
from topix.store.qdrant.store import ContentStore

MAX_RETRIEVAL_MESSAGES = 20


class AssistantSession(Session):
    """Session for the assistant agent."""

    def __init__(self, session_id: str):
        """Init method."""
        self._session_id = session_id
        self._content_store = ContentStore()

    async def get_items(self, limit: int = MAX_RETRIEVAL_MESSAGES) -> list[dict]:
        """Get items from the session."""
        res: list[Message] = await self._content_store.filt(
            filters={
                "must": [
                    {
                        "key": "type",
                        "match": {"value": "message"}
                    },
                    {
                        "key": "chat_uid",
                        "match": {"value": self._session_id}
                    }
                ]
            },
            include=True,
            limit=limit
        )
        return [item.to_chat_message() for item in res[::-1]]

    async def add_items(self, items: list[dict]) -> None:
        """Add items to the session."""
        messages = []
        for item in items:
            if "id" in item:
                del item["id"]
            item["chat_uid"] = self._session_id
            messages.append(Message(**item))

        await self._content_store.add(messages)

    async def pop_item(self) -> dict | None:
        """Pop the last item from the session."""
        items = await self.get_items(1)
        if not items:
            return None
        await self._content_store.delete(items[0]["id"])
        return items[0]

    async def clear_session(self) -> None:
        """Clear the session."""
        await self._content_store.delete_by_filters(
            filters={
                "must": [
                    {
                        "key": "type",
                        "match": {"value": "message"}
                    },
                    {
                        "key": "chat_uid",
                        "match": {"value": self._session_id}
                    }
                ]
            }
        )
