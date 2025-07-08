from typing import TypeVar
from pydantic import BaseModel
from qdrant_client.models import PointStruct

T = TypeVar("T", bound=BaseModel)


def to_struct_point(obj: T, embedding: list[float] | None = None) -> PointStruct:
    """
    Convert a Pydantic model to Qdrant PointStruct.
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
