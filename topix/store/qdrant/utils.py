"""Utility functions for Qdrant."""
from qdrant_client.models import ScoredPoint

from topix.datatypes.chat.chat import Message
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note

type Entry = Note | Link | Message


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
