"""Router for utils."""
import logging

from typing import Literal

from fastapi import APIRouter, HTTPException

from topix.api.utils.decorators import with_standard_response
from topix.config.services import service_config
from topix.utils.images.search import fetch_images, search_iconify_icons
from topix.utils.images.web import search_linkup, search_serper

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
async def search_images(
    query: str,
    limit: int = 5,
    engine: Literal["unsplash", "serper", "linkup"] = "unsplash",
):
    """Search for images."""
    match engine:
        case "unsplash":
            results = await fetch_images(query, limit)
        case "serper":
            res = await search_serper(query, num_results=limit)
            results = [{"url": url} for url in res]
        case "linkup":
            res = await search_linkup(query, num_results=limit)
            results = [{"url": url} for url in res]
        case _:
            raise HTTPException(status_code=400, detail="Invalid image search engine.")

    return {
        "images": results
    }


@router.get("/services/", include_in_schema=False)
@router.get("/services")
@with_standard_response
async def get_services() -> dict:
    """Get available services."""
    return {
        "llm": [llm.code for llm in service_config.llm],
        "search": [search.name for search in service_config.search],
        "navigate": [navigate.name for navigate in service_config.navigate],
        "code": [code.name for code in service_config.code],
    }
