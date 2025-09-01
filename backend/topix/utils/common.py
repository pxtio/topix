"""Common utility functions."""
from uuid import uuid4


def gen_uid() -> str:
    """Generate a unique id string."""
    return str(uuid4()).replace('-', '')
