"""File utilities."""
import base64

from pathlib import Path
from typing import Literal

# Define data directories
# absolute path for data
DATADIR = Path(__file__).parent.parent.parent / "data"
# representative data dir for external use
REP_DATADIR = "/data"

# relative path for thumbnails
THUMBNAIL_RELPATH = "thumbnails"
# absolute path for thumbnails
THUMBNAIL_DIR = DATADIR / THUMBNAIL_RELPATH
# create directories if not exist
THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)
# rep path for thumbnails
THUMBNAIL_REPPATH = REP_DATADIR + "/" + THUMBNAIL_RELPATH

# relative path for cache
CACHE_RELPATH = "cache"
CACHE_DIR = DATADIR / CACHE_RELPATH
CACHE_DIR.mkdir(parents=True, exist_ok=True)
# rep path for cache
CACHE_REPPATH = REP_DATADIR + "/" + CACHE_RELPATH

# relative path for logs
LOG_RELPATH = "logs"
LOG_DIR = DATADIR / LOG_RELPATH
LOG_DIR.mkdir(parents=True, exist_ok=True)
# rep path for logs
LOG_REPPATH = REP_DATADIR + "/" + LOG_RELPATH

# relative path for images
IMAGE_RELPATH = "images"
# absolute path for images
IMAGE_DIR = DATADIR / IMAGE_RELPATH
IMAGE_DIR.mkdir(parents=True, exist_ok=True)
# rep path for images
IMAGE_REPPATH = REP_DATADIR + "/" + IMAGE_RELPATH

# relative path for files
FILE_RELPATH = "files"
# absolute path for files
FILE_DIR = DATADIR / FILE_RELPATH
FILE_DIR.mkdir(parents=True, exist_ok=True)
# rep path for files
FILE_REPPATH = REP_DATADIR + "/" + FILE_RELPATH


def save_file(
    filename: str,
    file_bytes: bytes,
    cat: Literal["images", "files", "thumbnails", "cache", "logs"] = "files",
) -> str:
    """Save file to the file directory.

    Args:
        filename (str): The name of the file.
        file_bytes (bytes): The content of the file in bytes.
        cat (Literal): The category of the file. Defaults to "files".

    Returns:
        str: The relative path to the saved file.

    """
    match cat:
        case "images":
            file_path = IMAGE_DIR / filename
            rep_path = IMAGE_REPPATH + f"/{filename}"
        case "thumbnails":
            file_path = THUMBNAIL_DIR / filename
            rep_path = THUMBNAIL_REPPATH + f"/{filename}"
        case "cache":
            file_path = CACHE_DIR / filename
            rep_path = CACHE_REPPATH + f"/{filename}"
        case "logs":
            file_path = LOG_DIR / filename
            rep_path = LOG_REPPATH + f"/{filename}"
        case _:
            file_path = FILE_DIR / filename
            rep_path = FILE_REPPATH + f"/{filename}"

    with open(file_path, "wb") as f:
        f.write(file_bytes)
    return "file://" + rep_path


def save_base64_image_url(
    filename: str,
    url: str,
    cat: Literal["images", "thumbnails", "cache", "logs", "files"] = "images",
) -> str:
    """Save a base64 encoded image to the image directory.

    Args:
        filename (str): The name of the file.
        url (str): The base64 encoded image URL.
        cat (Literal): The category of the file. Defaults to "images".

    Returns:
        str: The representative path starting with "file://" to the saved image.

    """
    _, base64_str = url.split(",", 1)
    file_bytes = base64.b64decode(base64_str)
    return save_file(filename, file_bytes, cat=cat)


def get_file_path(
    rep_path: str
) -> str:
    """Get the absolute file path from the representative path.

    Args:
        rep_path (str): The representative path of the file.

    Returns:
        str: The absolute path of the file.

    """
    # if starts with file://, remove it
    if rep_path.startswith("file://"):
        rep_path = rep_path[len("file://"):]
    if rep_path.startswith(REP_DATADIR):
        abs_path = DATADIR / rep_path[len(REP_DATADIR) + 1:]
        return str(abs_path)
    return rep_path


def convert_to_base64_url(
    rep_path: str,
    mime_type: str = "image/png",
) -> str | None:
    """Convert a representative file path to a base64 data URL."""
    try:
        abs_path = get_file_path(rep_path)
        p = Path(abs_path)
        data = p.read_bytes()
        b64 = base64.b64encode(data).decode("utf-8")
        return f"data:{mime_type};base64,{b64}"
    except Exception:
        return None


def detect_mime_type(
    filename: str
) -> str:
    """Detect MIME type based on file extension.

    Args:
        filename (str): The name of the file.

    Returns:
        str: The detected MIME type.

    """
    ext = Path(filename).suffix.lower()
    match ext:
        case ".png":
            return "image/png"
        case ".jpg" | ".jpeg":
            return "image/jpeg"
        case ".gif":
            return "image/gif"
        case ".bmp":
            return "image/bmp"
        case ".webp":
            return "image/webp"
        case ".pdf":
            return "application/pdf"
        case ".txt":
            return "text/plain"
        case ".csv":
            return "text/csv"
        case ".json":
            return "application/json"
        case _:
            return "application/octet-stream"
