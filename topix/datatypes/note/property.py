"""Property classes."""

from __future__ import annotations

import abc
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

from topix.datatypes.enum import CustomEnum
from topix.datatypes.lang import LangCodeEnum
from topix.datatypes.mime import MimeTypeEnum
from topix.utils.common import gen_uid

if TYPE_CHECKING:
    import builtins


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

    uid: str = Field(default_factory=lambda: f"property_{gen_uid()}")
    type: PropertyTypeEnum


class NumberProperty(Property):
    """Property for numeric values."""

    type: PropertyTypeEnum = PropertyTypeEnum.NUMBER
    number: int | float | None = None


class DateProperty(Property):
    """Property for date values."""

    type: PropertyTypeEnum = PropertyTypeEnum.DATE
    date: str | None = None


class BooleanProperty(Property):
    """Property for boolean values."""

    type: PropertyTypeEnum = PropertyTypeEnum.BOOLEAN
    boolean: bool | None = None


class TextProperty(Property):
    """Property for text values."""

    type: PropertyTypeEnum = PropertyTypeEnum.TEXT
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

    type: PropertyTypeEnum = PropertyTypeEnum.ICON
    icon: Icon | Emoji | None = None


class ImageProperty(Property):
    """Property for image values."""

    class Image(BaseModel):
        """Image data model."""

        url: str
        caption: str | None = None

    type: PropertyTypeEnum = PropertyTypeEnum.IMAGE
    image: Image | None = None


class FileProperty(Property):
    """Property for file values."""

    class File(BaseModel):
        """File data model."""

        url: str
        name: str
        size: float | None = None
        mime_type: MimeTypeEnum | None = None

    type: PropertyTypeEnum = PropertyTypeEnum.FILE
    file: File | None = None


class URLProperty(Property):
    """Property for URL values."""

    class URL(BaseModel):
        """URL data model."""

        url: str

    type: PropertyTypeEnum = PropertyTypeEnum.URL
    url: URL | None = None


class MultiTextProperty(Property):
    """Property for multiple text values."""

    type: PropertyTypeEnum = PropertyTypeEnum.MULTI_TEXT
    texts: list[str] = []  # list of str


class KeywordProperty(Property):
    """Property for keyword values."""

    type: PropertyTypeEnum = PropertyTypeEnum.KEYWORD
    value: int | str | None = None
    value_type: builtins.type[CustomEnum] | None = None


class LanguageProperty(KeywordProperty):
    """Property for language values."""

    type: PropertyTypeEnum = PropertyTypeEnum.KEYWORD
    value_type: builtins.type[CustomEnum] = LangCodeEnum


class MimeTypeProperty(KeywordProperty):
    """Property for MIME type values."""

    value_type: type[CustomEnum] = MimeTypeEnum


class MultiKeywordProperty(Property):
    """Property for multiple keyword values."""

    type: PropertyTypeEnum = PropertyTypeEnum.MULTI_KEYWORD
    values: list[int | str] = []
    value_type: builtins.type[CustomEnum] | None = None


class LocationProperty(Property):
    """Property for location values."""

    class Location(BaseModel):
        """Location data model."""

        latitude: float
        longitude: float

    type: PropertyTypeEnum = PropertyTypeEnum.LOCATION
    location: Location | None = None


class PositionProperty(Property):
    """Property for position values."""

    class Position(BaseModel):
        """Position data model."""

        x: float
        y: float

    type: PropertyTypeEnum = PropertyTypeEnum.POSITION
    position: Position | None = None


class SizeProperty(Property):
    """Property for size values."""

    class Size(BaseModel):
        """Size data model."""

        width: float
        height: float

    type: PropertyTypeEnum = PropertyTypeEnum.SIZE
    size: Size | None = None
