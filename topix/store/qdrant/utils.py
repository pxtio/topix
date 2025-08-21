"""Utility functions for Qdrant."""

from qdrant_client.models import Record, ScoredPoint

from topix.datatypes.chat.chat import Message
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


def convert_point(
    point: ScoredPoint | Record,
) -> (
    Resource | tuple[Resource, list[list[float]]] | str | tuple[str, list[list[float]]]
):
    """Convert a Qdrant point to a resource."""
    resource = point.id
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
            case _:
                raise ValueError(f"Unknown type: {type_}")

    if point.vector:
        return resource, point.vector
    return resource
