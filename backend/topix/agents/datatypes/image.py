"""Web Search Settings Data Types."""
from enum import StrEnum


class ImageSearchOption(StrEnum):
    """Enumeration of image search options."""

    LINKUP = "linkup"
    SERPER = "serper"


class ImageSearchLocation(StrEnum):
    """Enumeration of image search locations."""

    US = "us"
    FR = "fr"
