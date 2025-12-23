"""Utility functions for Qdrant."""

from pydantic import BaseModel
from qdrant_client.models import FieldCondition, Filter, MatchValue, Record, ScoredPoint

from topix.datatypes.chat.chat import Message
from topix.datatypes.file.chunk import Chunk
from topix.datatypes.file.document import Document
from topix.datatypes.newsfeed.newsfeed import Newsfeed
from topix.datatypes.newsfeed.subscription import Subscription
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note
from topix.datatypes.resource import Resource


def payload_dict_to_field_list(payload_dict: dict, prefix: str = "") -> list[str]:
    """Convert a nested dict to a list of dot-notation field paths.

    Convert a nested dict like { "a": True, "b": { "c": { "d": True, "e": True }}}
    to a list of dot-notation field paths: ["a", "b.c.d", "b.c.e"].

    """
    fields = []
    for key, value in payload_dict.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if value is True:
            fields.append(full_key)
        elif isinstance(value, dict):
            fields.extend(payload_dict_to_field_list(value, full_key))
        # else: skip (only True and dict supported)
    return fields


def convert_dict_to_must_match_filter(filter_dict: dict) -> Filter:
    """Convert a dict to a Qdrant must match filter."""
    query_filter = Filter(
        must=[
            FieldCondition(key=key, match=MatchValue(value=value))
            for key, value in filter_dict.items()
        ]
    )
    return query_filter


class RetrieveOutput(BaseModel):
    """Output for all methods involving retrieval."""

    id: str
    resource: Resource | None = None
    vector: list[list[float]] | None = None
    score: float | None = None


def convert_point(  # noqa: C901
    point: ScoredPoint | Record,
) -> RetrieveOutput:
    """Convert a Qdrant point to a resource."""
    resource = None
    score = None
    if isinstance(point, ScoredPoint):
        score = point.score

    if point.payload:
        type_ = point.payload.get("type")
        if "id" not in point.payload:
            point.payload["id"] = point.id
        match type_:
            case "note":
                resource = Note.partial(**point.payload)
            case "message":
                resource = Message.partial(**point.payload)
            case "link":
                resource = Link.partial(**point.payload)
            case "subscription":
                resource = Subscription.partial(**point.payload)
            case "newsfeed":
                resource = Newsfeed.partial(**point.payload)
            case "document":
                resource = Document.partial(**point.payload)
            case "chunk":
                resource = Chunk.partial(**point.payload)
            case _:
                raise ValueError(f"Unknown type: {type_}")

    return RetrieveOutput(
        id=point.id,
        resource=resource,
        score=score,
        vector=point.vector
    )


# TODO: implement a helper that converts a filter dict -> Qdrant Filter object
def build_qdrant_filter(filter_dict: dict):
    """Build a Qdrant filter from a dict."""
    pass
