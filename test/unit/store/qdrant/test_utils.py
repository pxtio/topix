"""Test utilities for Qdrant store."""
import pytest

from topix.store.qdrant.utils import payload_dict_to_field_list


@pytest.mark.parametrize(
    "payload_dict, expected",
    [
        (
            {"a": True, "b": {"c": {"d": True, "e": True}}},
            ["a", "b.c.d", "b.c.e"],
        ),
        (
            {"x": True, "y": {"z": True}},
            ["x", "y.z"],
        ),
        (
            {"a": True, "b": {"c": {"d": True, "e": False}}},
            ["a", "b.c.d"],  # 'e' is False, should be ignored
        ),
        (
            {"root": {"leaf1": True, "leaf2": {"subleaf": True}}},
            ["root.leaf1", "root.leaf2.subleaf"],
        ),
        (
            {},
            [],
        ),
    ]
)
def test_payload_dict_to_field_list(payload_dict, expected):
    """Test conversion of payload dictionary to field list."""
    assert sorted(payload_dict_to_field_list(payload_dict)) == sorted(expected)
