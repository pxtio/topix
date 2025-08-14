"""ContentStore for managing notes and messages in Qdrant."""

import json

from qdrant_client.models import ScoredPoint

from topix.datatypes.chat.chat import Message
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note
from topix.datatypes.note.property import TextProperty
from topix.nlp.embed import OpenAIEmbedder
from topix.store.qdrant.base import QdrantStore

type Entry = Note | Link | Message


class ContentStore:
    """Manager for handling notes in the Qdrant store."""

    def __init__(self):
        """Init method."""
        self.qdrant_client = QdrantStore.from_config()
        self.embedder = OpenAIEmbedder.from_config()

    @staticmethod
    def convert_point_to_entry(point: ScoredPoint) -> Entry:
        """Convert a Qdrant point to a note or message."""
        match point.payload.get("type"):
            case "note":
                return Note.model_construct(**point.payload)
            case "link":
                return Link.model_construct(**point.payload)
            case "message":
                return Message.model_construct(**point.payload)
            case _:
                raise ValueError(
                    f"Unknown type in payload: {point.payload.get('type')}"
                )

    @staticmethod
    def extract_text_from_dict(entry: dict) -> str:
        """Extract text content from a dictionary entry."""
        if "type" not in entry or entry["type"] not in ["note", "link", "message"]:
            raise ValueError(
                "Entry must have a 'type' field with 'note', 'link' or 'message'."
            )
        if entry["type"] == "note" and "content" in entry:
            return entry["content"].get("markdown", "")
        elif entry["type"] == "link":
            return entry.get("label", "")
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
        elif isinstance(entry, Link):
            return entry.label or ""
        elif isinstance(entry, Message):
            if isinstance(entry.content, str):
                return entry.content
            elif isinstance(entry.content, list):
                return json.dumps(entry.content)
        return ""

    async def _embed(
        self, entries: list[Entry]
    ) -> list[list[float] | list[list[float]] | None]:
        searchable_texts = []
        indices = []
        for i, entry in enumerate(entries):
            for prop in entry.properties.values():
                if isinstance(prop, TextProperty):
                    if prop.searchable and prop.text:
                        searchable_texts.append(prop.text)
                        indices.append(i)
        embeds = await self.embedder.embed(searchable_texts)
        # Create a list of embeddings with the same length as entries
        embeddings = [None] * len(entries)
        for i, idx in enumerate(indices):
            embeddings[idx] = embeds[i]
        return embeddings

    async def add(self, entries: list[Entry]):
        """Create a new note in the Qdrant store."""
        await self.qdrant_client.add(
            objects=entries,
            embeddings=await self._embed(entries),
        )

    async def update(self, idx: str, data: dict):
        """Update existing notes in the Qdrant store."""
        new_embedding: list[float] | None = None

        # If the entry is a note or message, extract text for embedding
        if "type" in data and data["type"] in ["note", "message"]:
            text = self.extract_text_from_dict(data)
            if text:
                new_embedding = (await self.embedder.embed([text]))[0]
        await self.qdrant_client.update_fields(
            point_id=idx, fields=data, embedding=new_embedding
        )

    async def delete(self, idx: str):
        """Delete a note from the Qdrant store."""
        await self.qdrant_client.delete(point_id=idx)

    async def mget(
        self, ids: list[str], include: dict | bool | None = True
    ) -> list[Entry]:
        """Retrieve multiple notes from the Qdrant store by their IDs."""
        results = await self.qdrant_client.mget(point_ids=ids, include=include)
        return [self.convert_point_to_entry(point) for point in results]

    async def filt(
        self,
        filters: dict | None = None,
        limit: int = 1000,
        include: dict | bool | None = True,
        order: dict | str | None = None,
    ) -> list[Entry]:
        """Retrieve all notes from the Qdrant store."""
        if order is None:
            order = {"key": "created_at", "direction": "desc"}
        results = await self.qdrant_client.filt(
            filters=filters, include=include, limit=limit, order=order
        )
        return [self.convert_point_to_entry(point) for point in results]

    async def search(
        self,
        query: str,
        limit: int = 5,
        filters: dict | None = None,
        include: dict | bool | None = True,
    ) -> list[Entry]:
        """Search for notes in the Qdrant store."""
        embedding = await self.embedder.embed([query])
        results = await self.qdrant_client.search(
            embedding=embedding[0], limit=limit, filters=filters, include=include
        )
        return [self.convert_point_to_entry(point) for point in results]

    async def delete_by_filters(self, filters: dict):
        """Delete notes in the Qdrant store that match the given filters."""
        await self.qdrant_client.delete_by_filters(filters=filters)

    async def close(self):
        """Close the Qdrant client connection."""
        await self.qdrant_client.close()
