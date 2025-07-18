"""Utility functions for Qdrant."""


def payload_dict_to_field_list(payload_dict: dict, prefix: str = "") -> list[str]:
    """Convert a nested dict like { "a": True, "b": { "c": { "d": True, "e": True }}}
    to a list of dot-notation field paths: ["a", "b.c.d", "b.c.e"].
    """
    fields = []
    for key, value in payload_dict.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if value is True:
            fields.append(full_key)
        elif isinstance(value, dict):
            fields.extend(payload_dict_to_field_list(value, full_key))
        # else: skip (only True and dict supported)
    return fields
