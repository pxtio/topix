"""Router for utils."""
import logging

from fastapi import APIRouter

from topix.api.utils.decorators import with_standard_response
from topix.utils.images.search import fetch_images, search_iconify_icons

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/utils",
    tags=["utils"],
    responses={404: {"description": "Not found"}},
)


@router.get("/icons/search/", include_in_schema=False)
@router.get("/icons/search")
@with_standard_response
async def search_icons(query: str, limit: int = 5):
    """Search for icons."""
    results = await search_iconify_icons(query, limit)
    return {
        "icons": [res.model_dump(exclude_none=True) for res in results]
    }


@router.get("/images/search/", include_in_schema=False)
@router.get("/images/search")
@with_standard_response
async def search_images(query: str, limit: int = 5):
    """Search for images."""
    results = await fetch_images(query, limit)
    return {
        "images": results
    }
