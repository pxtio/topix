"""Base class for resources."""

from __future__ import annotations

import logging

from datetime import datetime

from pydantic import BaseModel, Field, TypeAdapter

from topix.datatypes.property import DataProperty
from topix.utils.common import gen_uid

logger = logging.getLogger(__name__)


class RichText(BaseModel):
    """Rich text object."""

    markdown: str
    searchable: bool = True


class Resource(BaseModel):
    """Base class for notes, documents, etc..."""

    type: str
    id: str = Field(default_factory=gen_uid)
    version: int = 1

    # properties
    properties: dict[str, DataProperty] = {}

    # content
    label: RichText | None = None
    content: RichText | None = None

    # datetime
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str | None = None
    deleted_at: str | None = None

    @classmethod
    def partial(cls, id: str, **kwargs) -> Resource:
        """Create a partial Resource instance.

        This method allows constructing a Resource from incomplete data:
        required fields such as `type` and `id` may be omitted.
        However, nested objects must still be complete. For example,
        `{"content": {"searchable": True}}` is invalid because `RichText`
        requires all of its fields.
        """
        values = {}
        errors = []

        for k, v in kwargs.items():
            if k not in cls.model_fields:
                logger.warning(f"Unknown field: {k}")
                continue
            try:
                adapter = TypeAdapter(cls.model_fields[k].annotation)
                values[k] = adapter.validate_python(v)
            except Exception as e:
                errors.append(f"Field '{k}': {e}")

        if errors:
            raise ValueError(" | ".join(errors))

        all_values = {
            name: values.get(name, None) for name in cls.model_fields
        }
        all_values["id"] = id
        return cls.model_construct(**all_values)
