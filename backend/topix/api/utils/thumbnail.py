"""Thumbnail utilities for the API."""

import logging

from datetime import datetime

from topix.utils.file import convert_to_base64_url, save_file

logger = logging.getLogger(__name__)


def save_thumbnail(
    board_id: str,
    bytes: bytes,
) -> str:
    """Save thumbnail PNG bytes to disk and return its file:// path.

    Args:
        board_id: identifier for the board
        bytes: raw PNG bytes (from frontend Blob)

    Returns:
        str: absolute path starting with file://

    """
    return save_file(
        filename=f"thumbnail_{board_id}_{datetime.now().isoformat()}.png",
        file_bytes=bytes,
        cat="thumbnails",
    )


def load_png_as_data_url(path: str) -> str | None:
    """Convert PNG to base64 string."""
    return convert_to_base64_url(
        rep_path=path,
        mime_type="image/png",
    )
