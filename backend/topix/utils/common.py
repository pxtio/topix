"""Common utility functions."""
from pathlib import Path
from uuid import uuid4


def gen_uid() -> str:
    """Generate a unique id string."""
    return str(uuid4()).replace('-', '')


def running_in_docker() -> bool:
    """Check if the code is running inside a Docker container."""
    return Path("/.dockerenv").exists()
