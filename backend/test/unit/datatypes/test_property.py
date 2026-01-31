"""Unit tests for property data models."""

from enum import IntEnum

import pytest

from pydantic import TypeAdapter, ValidationError

from topix.datatypes.property import (
    DataProperty,
    IconProperty,
    KeywordProperty,
    MultiKeywordProperty,
    MultiTextProperty,
    NumberProperty,
    PropertyType,
    TextProperty,
)


def test_number_property_sets_id_and_type():
    """NumberProperty should auto-generate an id and enforce its type."""
    prop = NumberProperty(number=3.14)

    assert prop.type is PropertyType.NUMBER
    assert prop.number == 3.14
    assert isinstance(prop.id, str)
    # gen_uid returns a hyphen-less UUID (32 chars)
    assert len(prop.id) == 32


def test_icon_property_accepts_icon_and_emoji_variants():
    """IconProperty should parse both icon URLs and emoji payloads."""
    icon_prop = IconProperty(icon={"type": "icon", "icon": "http://example.com/icon.png"})
    emoji_prop = IconProperty(icon={"type": "emoji", "emoji": ":)"})

    assert icon_prop.icon.type == "icon"
    assert icon_prop.icon.icon.endswith("icon.png")
    assert emoji_prop.icon.type == "emoji"
    assert emoji_prop.icon.emoji == ":)"


def test_mutable_defaults_are_not_shared_between_instances():
    """Each instance should get its own list defaults."""
    first_texts = MultiTextProperty()
    first_texts.texts.append("first")

    second_texts = MultiTextProperty()
    assert second_texts.texts == []

    first_keywords = MultiKeywordProperty()
    first_keywords.values.append("alpha")

    second_keywords = MultiKeywordProperty()
    assert second_keywords.values == []


def test_keyword_property_retains_enum_type_metadata():
    """value_type should capture the enum class used for keyword values."""

    class Priority(IntEnum):
        LOW = 1
        HIGH = 2

    prop = KeywordProperty(value=Priority.HIGH, value_type=Priority)

    assert prop.value == Priority.HIGH
    assert prop.value_type is Priority


def test_data_property_discriminates_by_type():
    """Discriminated union should produce the right model from raw data."""
    adapter = TypeAdapter(DataProperty)
    parsed = adapter.validate_python({"type": "text", "text": "hello", "searchable": True})

    assert isinstance(parsed, TextProperty)
    assert parsed.text == "hello"
    assert parsed.searchable is True


def test_data_property_rejects_unknown_type():
    """Invalid discriminator values should raise a validation error."""
    adapter = TypeAdapter(DataProperty)

    with pytest.raises(ValidationError):
        adapter.validate_python({"type": "not_a_property", "value": "nope"})
