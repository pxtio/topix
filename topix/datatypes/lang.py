"""This module contains the language enum and language code enum."""
from __future__ import annotations

from topix.datatypes.enum import CustomEnum


class LangCodeEnum(str, CustomEnum):
    """Language Enum"""
    ENGLISH = "en"
    FRENCH = "fr"
    SPANISH = "es"
    GERMAN = "de"
    ITALIAN = "it"
    DUTCH = "nl"


class LangEnum(str, CustomEnum):
    """Language Enum"""
    ENGLISH = "English"
    FRENCH = "French"
    SPANISH = "Spanish"
    GERMAN = "German"
    ITALIAN = "Italian"
    DUTCH = "Dutch"


# Mapping between LangEnum and LangCodeEnum
LANGCODEMAPPING = {
    LangCodeEnum.ENGLISH: LangEnum.ENGLISH,
    LangCodeEnum.FRENCH: LangEnum.FRENCH,
    LangCodeEnum.SPANISH: LangEnum.SPANISH,
    LangCodeEnum.GERMAN: LangEnum.GERMAN,
    LangCodeEnum.ITALIAN: LangEnum.ITALIAN,
    LangCodeEnum.DUTCH: LangEnum.DUTCH,
}
