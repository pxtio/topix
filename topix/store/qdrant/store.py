"""ContentStore for managing notes and messages in Qdrant."""

import json

from qdrant_client.models import ScoredPoint

from topix.datatypes.chat.chat import Message
from topix.datatypes.note.note import Note
from topix.nlp.embed import OpenAIEmbedder
from topix.store.qdrant.base import QdrantStore


type Entry = Note | Message


class ContentStore:
    """Manager for handling notes in the Qdrant store."""

    def __init__(self):
        self.qdrant_client = QdrantStore.from_config()
        self.embedder = OpenAIEmbedder.from_config()

    @staticmethod
    def convert_entry_to_payload(entry: Entry) -> dict:
        """Convert a note or message to a payload for Qdrant."""
        return entry.model_dump(
            exclude_none=True,
            exclude={"id"}
        )

    @staticmethod
    def convert_point_to_entry(point: ScoredPoint) -> Entry:
        """Convert a Qdrant point to a note or message."""
        if point.payload["type"] == "note":
            return Note(
                **point.payload,
                id=point.id
            )
        elif point.payload["type"] == "message":
            return Message.model_construct(
                **point.payload,
                id=point.id
            )
        raise ValueError("Unknown type in payload. Expected 'note' or 'message'.")

    @staticmethod
    def extract_text_from_dict(entry: dict) -> str:
        """Extract text content from a dictionary entry."""
        if "type" not in entry or entry["type"] not in ["note", "message"]:
            raise ValueError(
                "Entry must have a 'type' field with 'note' or 'message'."
            )
        if entry["type"] == "note" and "content" in entry:
            return entry["content"].get("markdown", "")
        elif entry["type"] == "message":
            content = entry.get("content", "")
            if isinstance(content, str):
                return content
            elif isinstance(content, list):
                return json.dumps(content)
        return ""

    @staticmethod
    def extract_text(entry: Entry | dict) -> str:
        """Extract text content from a note or message."""
        if isinstance(entry, Note) and entry.content:
            return entry.content.markdown
        elif isinstance(entry, Message):
            if isinstance(entry.content, str):
                return entry.content
            elif isinstance(entry.content, list):
                return json.dumps(entry.content)
        return ""

    async def add(self, entries: list[Entry]):
        """Create a new note in the Qdrant store."""
        await self.qdrant_client.add(
            objects=[self.convert_entry_to_payload(entry) for entry in entries],
            embeddings=await self.embedder.embed(
                [self.extract_text(entry) for entry in entries]
            )
        )

    async def update(self, idx: str, data: dict):
        """Update existing notes in the Qdrant store."""
        new_embedding: list[float] | None = None
        text = self.extract_text_from_dict(data)
        if text:
            new_embedding = await self.embedder.embed([text])
        await self.qdrant_client.update_fields(
            point_id=idx,
            payload=data,
            embedding=new_embedding
        )

    async def delete(self, idx: str):
        """Delete a note from the Qdrant store."""
        await self.qdrant_client.delete(point_id=idx)

    async def mget(
        self,
        ids: list[str],
        include: dict | bool | None = True
    ) -> list[Entry]:
        """Retrieve multiple notes from the Qdrant store by their IDs."""
        results = await self.qdrant_client.mget(
            point_ids=ids,
            include=include
        )
        return [self.convert_point_to_entry(point) for point in results]

    async def filt(
        self,
        filters: dict | None = None,

    ) -> list[Entry]:
        """Retrieve all notes from the Qdrant store."""
        results = await self.qdrant_client.filt(
            filters=filters,
            include=True,
        )
        return [
            self.convert_point_to_entry(point) for point in results
        ]
