"""Thumbnail utilities for the API."""

from datetime import datetime
from pathlib import Path


def save_thumbnail(
    board_id: str,
    file_bytes: bytes,
    base_dir: str = "data"
) -> str:
    """Save thumbnail PNG bytes to disk and return its file:// path.

    Args:
        board_id: identifier for the board
        file_bytes: raw PNG bytes (from frontend Blob)
        base_dir: root folder to store thumbnails (default: ./data)

    Returns:
        str: absolute path starting with file://

    """
    # ensure base dir exists
    base_path = Path(base_dir).resolve()
    base_path.mkdir(parents=True, exist_ok=True)

    # unique filename (board id + timestamp)
    timestamp = datetime.now().isoformat()
    filename = f"{board_id}_{timestamp}.png"
    filepath = base_path / filename

    # write the file
    with open(filepath, "wb") as f:
        f.write(file_bytes)

    # return absolute file:// path
    return f"file://{filepath}"
