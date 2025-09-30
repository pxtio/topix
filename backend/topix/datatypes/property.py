"""Property classes."""

from __future__ import annotations

import abc

from enum import IntEnum, StrEnum
from typing import Annotated, Literal, Type

from pydantic import BaseModel, Field

from topix.agents.datatypes.annotations import SearchResult
from topix.agents.datatypes.tool_call import ToolCall
from topix.datatypes.mime import MimeTypeEnum
from topix.utils.common import gen_uid


class PropertyType(StrEnum):
    """Property type enum."""

    NUMBER = "number"
    DATE = "date"
    BOOLEAN = "boolean"
    TEXT = "text"
    MULTI_TEXT = "multi_text"
    KEYWORD = "keyword"
    MULTI_KEYWORD = "multi_keyword"
    LOCATION = "location"
    POSITION = "position"
    SIZE = "size"
    ICON = "icon"
    IMAGE = "image"
    FILE = "file"
    URL = "url"
    REASONING = "reasoning"
    MULTI_SOURCE = "multi_source"


class Property(abc.ABC, BaseModel):
    """Base class for all property types."""

    id: str = Field(default_factory=gen_uid)
    type: PropertyType


class NumberProperty(Property):
    """Property for numeric values."""

    type: Literal[PropertyType.NUMBER] = PropertyType.NUMBER
    number: int | float | None = None


class DateProperty(Property):
    """Property for date values."""

    type: Literal[PropertyType.DATE] = PropertyType.DATE
    date: str | None = None


class BooleanProperty(Property):
    """Property for boolean values."""

    type: Literal[PropertyType.BOOLEAN] = PropertyType.BOOLEAN
    boolean: bool | None = None


class TextProperty(Property):
    """Property for text values."""

    type: Literal[PropertyType.TEXT] = PropertyType.TEXT
    text: str | None = None
    searchable: bool | None = None


class IconProperty(Property):
    """Property for icon or emoji values."""

    class Icon(BaseModel):
        """Icon data model."""

        type: Literal['icon'] = 'icon'
        icon: str

    class Emoji(BaseModel):
        """Emoji data model."""

        type: Literal['emoji'] = 'emoji'
        emoji: str

    type: Literal[PropertyType.ICON] = PropertyType.ICON
    icon: Icon | Emoji | None = None


class ImageProperty(Property):
    """Property for image values."""

    class Image(BaseModel):
        """Image data model."""

        url: str
        caption: str | None = None

    type: Literal[PropertyType.IMAGE] = PropertyType.IMAGE
    image: Image | None = None


class FileProperty(Property):
    """Property for file values."""

    class File(BaseModel):
        """File data model."""

        url: str
        name: str
        size: float | None = None
        mime_type: MimeTypeEnum | None = None

    type: Literal[PropertyType.FILE] = PropertyType.FILE
    file: File | None = None


class URLProperty(Property):
    """Property for URL values."""

    class URL(BaseModel):
        """URL data model."""

        url: str

    type: Literal[PropertyType.URL] = PropertyType.URL
    url: URL | None = None


class MultiTextProperty(Property):
    """Property for multiple text values."""

    type: Literal[PropertyType.MULTI_TEXT] = PropertyType.MULTI_TEXT
    texts: list[str] = []  # list of str


class KeywordProperty(Property):
    """Property for keyword values."""

    type: Literal[PropertyType.KEYWORD] = PropertyType.KEYWORD
    value: int | str | None = None
    value_type: Type[IntEnum | StrEnum] | None = None


class MultiKeywordProperty(Property):
    """Property for multiple keyword values."""

    type: Literal[PropertyType.MULTI_KEYWORD] = PropertyType.MULTI_KEYWORD
    values: list[int | str] = []
    value_type: Type[IntEnum | StrEnum] | None = None


class LocationProperty(Property):
    """Property for location values."""

    class Location(BaseModel):
        """Location data model."""

        latitude: float
        longitude: float

    type: Literal[PropertyType.LOCATION] = PropertyType.LOCATION
    location: Location | None = None


class PositionProperty(Property):
    """Property for position values."""

    class Position(BaseModel):
        """Position data model."""

        x: float
        y: float

    type: Literal[PropertyType.POSITION] = PropertyType.POSITION
    position: Position | None = None


class SizeProperty(Property):
    """Property for size values."""

    class Size(BaseModel):
        """Size data model."""

        width: float
        height: float

    type: Literal[PropertyType.SIZE] = PropertyType.SIZE
    size: Size | None = None


class ReasoningProperty(Property):
    """Property for agent's reasoning steps."""

    type: Literal[PropertyType.REASONING] = PropertyType.REASONING
    reasoning: list[ToolCall] = []


class MultiSourceProperty(Property):
    """Property for multiple web source values."""

    type: Literal[PropertyType.MULTI_SOURCE] = PropertyType.MULTI_SOURCE
    sources: list[SearchResult] = []


type DataProperty = Annotated[
    (
        NumberProperty
        | DateProperty
        | BooleanProperty
        | TextProperty
        | IconProperty
        | ImageProperty
        | FileProperty
        | URLProperty
        | MultiTextProperty
        | KeywordProperty
        | MultiKeywordProperty
        | LocationProperty
        | PositionProperty
        | SizeProperty
        | ReasoningProperty
    ),
    Field(discriminator="type")
]
