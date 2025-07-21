"""Property classes."""

from __future__ import annotations

import abc

from typing import Literal, Type

from pydantic import BaseModel, Field

from topix.datatypes.enum import CustomEnum
from topix.datatypes.lang import LangCodeEnum
from topix.datatypes.mime import MimeTypeEnum
from topix.utils.common import gen_uid


class PropertyTypeEnum(str, CustomEnum):
    """Property type enum."""

    NUMBER = "number"
    DATE = "date"
    BOOLEAN = "boolean"
    TEXT = "text"
    MULTI_TEXT = "multi_text"
    KEYWORD = "keyword"
    MULTI_KEYWORD = "multi_keyword"
    REFERENCE = "reference"
    LOCATION = "location"
    POSITION = "position"
    SIZE = "size"
    ICON = "icon"
    IMAGE = "image"
    FILE = "file"
    URL = "url"
    STYLE = "style"


class Property(abc.ABC, BaseModel):
    """Base class for all property types."""

    id: str = Field(default_factory=gen_uid)
    type: PropertyTypeEnum


class NumberProperty(Property):
    """Property for numeric values."""

    type: Literal[PropertyTypeEnum.NUMBER] = PropertyTypeEnum.NUMBER
    number: int | float | None = None


class DateProperty(Property):
    """Property for date values."""

    type: Literal[PropertyTypeEnum.DATE] = PropertyTypeEnum.DATE
    date: str | None = None


class BooleanProperty(Property):
    """Property for boolean values."""

    type: Literal[PropertyTypeEnum.BOOLEAN] = PropertyTypeEnum.BOOLEAN
    boolean: bool | None = None


class TextProperty(Property):
    """Property for text values."""

    type: Literal[PropertyTypeEnum.TEXT] = PropertyTypeEnum.TEXT
    text: str | None = None
    searchable: bool | None = None


class SearchableTextProperty(TextProperty):
    """Property for text values that are searchable."""

    searchable: bool = True


class IconProperty(Property):
    """Property for icon or emoji values."""

    class Icon(BaseModel):
        """Icon data model."""

        type: str
        icon: str

    class Emoji(BaseModel):
        """Emoji data model."""

        emoji: str

    type: Literal[PropertyTypeEnum.ICON] = PropertyTypeEnum.ICON
    icon: Icon | Emoji | None = None


class ImageProperty(Property):
    """Property for image values."""

    class Image(BaseModel):
        """Image data model."""

        url: str
        caption: str | None = None

    type: Literal[PropertyTypeEnum.IMAGE] = PropertyTypeEnum.IMAGE
    image: Image | None = None


class FileProperty(Property):
    """Property for file values."""

    class File(BaseModel):
        """File data model."""

        url: str
        name: str
        size: float | None = None
        mime_type: MimeTypeEnum | None = None

    type: Literal[PropertyTypeEnum.FILE] = PropertyTypeEnum.FILE
    file: File | None = None


class URLProperty(Property):
    """Property for URL values."""

    class URL(BaseModel):
        """URL data model."""

        url: str

    type: Literal[PropertyTypeEnum.URL] = PropertyTypeEnum.URL
    url: URL | None = None


class MultiTextProperty(Property):
    """Property for multiple text values."""

    type: Literal[PropertyTypeEnum.MULTI_TEXT] = PropertyTypeEnum.MULTI_TEXT
    texts: list[str] = []  # list of str


class KeywordProperty(Property):
    """Property for keyword values."""

    type: Literal[PropertyTypeEnum.KEYWORD] = PropertyTypeEnum.KEYWORD
    value: int | str | None = None
    value_type: Type[CustomEnum] | None = None


class LanguageProperty(KeywordProperty):
    """Property for language values."""

    type: Literal[PropertyTypeEnum.KEYWORD] = PropertyTypeEnum.KEYWORD
    value_type: Type[CustomEnum] = LangCodeEnum


class MimeTypeProperty(KeywordProperty):
    """Property for MIME type values."""

    value_type: Type[CustomEnum] = MimeTypeEnum


class MultiKeywordProperty(Property):
    """Property for multiple keyword values."""

    type: Literal[PropertyTypeEnum.MULTI_KEYWORD] = PropertyTypeEnum.MULTI_KEYWORD
    values: list[int | str] = []
    value_type: Type[CustomEnum] | None = None


class LocationProperty(Property):
    """Property for location values."""

    class Location(BaseModel):
        """Location data model."""

        latitude: float
        longitude: float

    type: Literal[PropertyTypeEnum.LOCATION] = PropertyTypeEnum.LOCATION
    location: Location | None = None


class PositionProperty(Property):
    """Property for position values."""

    class Position(BaseModel):
        """Position data model."""

        x: float
        y: float

    type: Literal[PropertyTypeEnum.POSITION] = PropertyTypeEnum.POSITION
    position: Position | None = None


class SizeProperty(Property):
    """Property for size values."""

    class Size(BaseModel):
        """Size data model."""

        width: float
        height: float

    type: Literal[PropertyTypeEnum.SIZE] = PropertyTypeEnum.SIZE
    size: Size | None = None


type DataProperty = (
    NumberProperty
    | DateProperty
    | BooleanProperty
    | TextProperty
    | SearchableTextProperty
    | IconProperty
    | ImageProperty
    | FileProperty
    | URLProperty
    | MultiTextProperty
    | KeywordProperty
    | LanguageProperty
    | MimeTypeProperty
    | MultiKeywordProperty
    | LocationProperty
    | PositionProperty
    | SizeProperty
)


class Prop(BaseModel):
    """Property class for generic data properties."""

    prop: DataProperty = Field(..., discriminator="type")
