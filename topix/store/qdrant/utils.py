"""Utility functions for Qdrant."""

from typing import TypeVar

from pydantic import BaseModel
from qdrant_client.models import PointStruct

T = TypeVar("T", bound=BaseModel)


def to_struct_point(obj: T, embedding: list[float] | None = None) -> PointStruct:
    """Convert a Pydantic model to Qdrant PointStruct.
    If `embedding` is None, no vector is included (metadata-only).
    """
    point_id = getattr(obj, "uid", getattr(obj, "id", None))
    if point_id is None:
        raise ValueError("Object must have 'uid' or 'id' attribute.")

    kwargs = {
        "id": point_id,
        "payload": obj.model_dump(exclude_none=True)
    }

    if embedding is not None:
        kwargs["vector"] = embedding

    return PointStruct(**kwargs)


def payload_dict_to_field_list(payload_dict: dict, prefix: str = "") -> list[str]:
    """Convert a nested dict like { "a": True, "b": { "c": { "d": True, "e": True }}}
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
