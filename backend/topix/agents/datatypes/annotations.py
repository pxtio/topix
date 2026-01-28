"""Annotations for agent messages."""
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class SearchResult(BaseModel):
    """URL annotation for agent streams."""

    type: Literal["url"] = "url"
    url: str
    title: str | None = None
    content: str | None = None
    favicon: str | None = None
    cover_image: str | None = None
    published_at: str | None = None
    score: int | None = None
    source_domain: str | None = None
    tags: list[str] = []


class RefAnnotation(BaseModel):
    """Reference annotation for memory search."""

    type: Literal["reference"] = "reference"
    ref_id: str
    ref_type: str
    label: str | None = None
    content: str | None = None


class FileAnnotation(BaseModel):
    """Annotation of a generated file."""

    type: Literal["file"] = "file"
    file_type: str
    file_path: str
    file_id: str


type Annotation = Annotated[
    FileAnnotation | RefAnnotation | SearchResult,
    Field(discriminator="type")
]
