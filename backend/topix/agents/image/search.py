import asyncio
import json
import os
import logging
from typing import Literal, Optional
import httpx

from topix.agents.websearch.utils import get_from_date
from topix.datatypes.recurrence import Recurrence

semaphore = asyncio.Semaphore(5)


async def search_serper(
    query: str,
    num_results: int = 4,
    recency: Recurrence | None = None,
    location: Literal["us", "fr"] = "us",
    client: Optional[httpx.AsyncClient] = None,
    timeout: Optional[httpx.Timeout] = None,
) -> list[str]:
    """Search the serper API for images based on the query.

    Args:
        query: The query to search for.
        num_results: The number of results to return.
        recency: The recency of the search.
        language: The language of the search.

    Returns:
        return a list of image urls.
    """
    url = "https://google.serper.dev/images"
    api_key = os.environ.get("SERPER_API_KEY")
    headers = {
        'X-API-KEY': api_key,
        'Content-Type': 'application/json'
    }
    match recency:
        case Recurrence.DAILY:
            time_range = "d"
        case Recurrence.WEEKLY:
            time_range = "w"
        case Recurrence.MONTHLY:
            time_range = "m"
        case Recurrence.YEARLY:
            time_range = "y"
        case _:
            time_range = "y"
    payload = {
        "q": query,
        "num": num_results,
        "tbs": f"qdr:{time_range}",
        "gl": location
    }
    logging.info(f"Searching for images with query: {query}")
    async with semaphore:
        if client is None:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url, headers=headers, json=payload, timeout=timeout
                )
        else:
            response = await client.post(
                url, headers=headers, json=payload, timeout=timeout
            )

    logging.info(f"Response: {response.json()}")
    json_response = response.json()
    logging.info(f"Found {len(json_response['images'])} images")
    return [item["imageUrl"] for item in json_response["images"]]


async def search_linkup(
    query: str,
    num_results: int = 4,
    recency: Recurrence | None = None,
    client: Optional[httpx.AsyncClient] = None,
    timeout: Optional[httpx.Timeout] = None,
) -> list[str]:
    """Search for a query using the LinkUp API.

    Args:
        query: The query to search for.
        num_results: The number of results to return.
        recency: The recency of the search.

    Returns:
        return a list of image urls.
    """
    url = "https://api.linkup.so/v1/search"
    api_key = os.environ.get("LINKUP_API_KEY")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    search_depth = "standard"

    data = {
        "q": query,
        "outputType": "searchResults",
        "depth": search_depth,
        "includeImages": True,
    }
    if recency:
        from_date = get_from_date(recency).isoformat()
        data["fromDate"] = from_date

    async with semaphore:
        if client is None:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url, headers=headers, json=data, timeout=timeout
                )
        else:
            response = await client.post(
                url, headers=headers, json=data, timeout=timeout
            )

    json_response = response.json()
    results = json_response.get("results", [])
    urls = [result.get("url") for result in results if result.get("type") == "image"]

    return urls[:num_results]
