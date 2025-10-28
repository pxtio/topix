import json
import os
import logging
import requests

from topix.agents.websearch.utils import get_from_date
from topix.datatypes.recurrence import Recurrence


def search_serper(
    query: str,
    num_results: int = 4,
    recency: Recurrence | None = None,
    language: str = "fr",
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
    match language:
        case "en":
            location = "us"
        case "fr":
            location = "fr"
        case _:
            location = "us"
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
    payload = json.dumps({
        "q": query,
        "num": num_results,
        "tbs": f"qdr:{time_range}",
        "gl": location
    })
    logging.info(f"Searching for images with query: {query}")
    response = requests.request("POST", url, headers=headers, data=payload)
    response.raise_for_status()

    json_response = response.json()
    logging.info(f"Found {len(json_response['images'])} images")
    return [item["imageUrl"] for item in json_response["images"]]


def search_linkup(
    query: str,
    num_results: int = 4,
    recency: Recurrence | None = None
) -> list[str]:
    """Search for a query using the LinkUp API.

    Args:
        query: The query to search for.
        num_results: The number of results to return.
        recency: The recency of the search.

    Returns:
        WebSearchOutput: The results of the search.
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

    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()

    json_response = response.json()

    results = json_response.get("results", [])
    urls = [result.get("url") for result in results if result.get("type") == "image"]

    return urls[:num_results]
