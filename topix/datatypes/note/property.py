from __future__ import annotations

import abc
from typing import Type

from pydantic import BaseModel, Field
from topix.datatypes.enum import CustomEnum
from topix.datatypes.lang import LangCodeEnum
from topix.datatypes.mime import MimeTypeEnum
from topix.utils.common import gen_uid


class PropertyTypeEnum(str, CustomEnum):
    """
    Property type enum
    """
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
    """
    Base class for all property types.
    """
    uid: str = Field(default_factory=lambda: f"property_{gen_uid()}")
    type: PropertyTypeEnum


class NumberProperty(Property):
    type: PropertyTypeEnum = PropertyTypeEnum.NUMBER
    number: int | float | None = None


class DateProperty(Property):
    type: PropertyTypeEnum = PropertyTypeEnum.DATE
    date: str | None = None


class BooleanProperty(Property):
    type: PropertyTypeEnum = PropertyTypeEnum.BOOLEAN
    boolean: bool | None = None


class TextProperty(Property):
    type: PropertyTypeEnum = PropertyTypeEnum.TEXT
    text: str | None = None
    searchable: bool | None = None


class SearchableTextProperty(TextProperty):
    searchable: bool = True


class IconProperty(Property):

    class Icon(BaseModel):
        type: str
        icon: str

    class Emoji(BaseModel):
        emoji: str

    type: PropertyTypeEnum = PropertyTypeEnum.ICON
    icon: Icon | Emoji | None = None


class ImageProperty(Property):

    class Image(BaseModel):
        url: str
        caption: str | None = None

    type: PropertyTypeEnum = PropertyTypeEnum.IMAGE
    image: Image | None = None


class FileProperty(Property):

    class File(BaseModel):
        url: str
        name: str
        size: float | None = None
        mime_type: MimeTypeEnum | None = None

    type: PropertyTypeEnum = PropertyTypeEnum.FILE
    file: File | None = None


class URLProperty(Property):

    class URL(BaseModel):
        url: str

    type: PropertyTypeEnum = PropertyTypeEnum.URL
    url: URL | None = None


class MultiTextProperty(Property):
    type: PropertyTypeEnum = PropertyTypeEnum.MULTI_TEXT
    texts: list[str] = []  # list of str


class KeywordProperty(Property):
    type: PropertyTypeEnum = PropertyTypeEnum.KEYWORD
    value: int | str | None = None
    value_type: Type[CustomEnum] | None = None


class LanguageProperty(KeywordProperty):
    type: PropertyTypeEnum = PropertyTypeEnum.KEYWORD
    value_type: Type[CustomEnum] = LangCodeEnum


class MimeTypeProperty(KeywordProperty):
    value_type: Type[CustomEnum] = MimeTypeEnum


class MultiKeywordProperty(Property):
    type: PropertyTypeEnum = PropertyTypeEnum.MULTI_KEYWORD
    values: list[int | str] = []
    value_type: Type[CustomEnum] | None = None


class LocationProperty(Property):

    class Location(BaseModel):
        latitude: float
        longitude: float

    type: PropertyTypeEnum = PropertyTypeEnum.LOCATION
    location: Location | None = None


class PositionProperty(Property):

    class Position(BaseModel):
        x: float
        y: float

    type: PropertyTypeEnum = PropertyTypeEnum.POSITION
    position: Position | None = None


class SizeProperty(Property):

    class Size(BaseModel):
        width: float
        height: float

    type: PropertyTypeEnum = PropertyTypeEnum.SIZE
    size: Size | None = None
