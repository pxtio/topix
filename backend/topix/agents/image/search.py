import json
import os
import logging
import requests
from typing import Literal


def search_serper(
    query: str,
    num_results: int = 4,
    time_range: Literal["d", "w", "m", "y"] = "y",
    location: str = "fr",
) -> list[str]:
    """Search the serper API for images based on the query.

    Args:
        query: The query to search for.
        num_results: The number of results to return.
        time_range: The time range to search for.
        location: The location of the search.

    Returns:
        return a list of image urls.
    """
    if location not in ["us", "fr"]:
        logging.warning(f"Invalid location: {location}, setting to default location: us")
        location = "us"
    url = "https://google.serper.dev/images"
    payload = json.dumps({
        "q": query,
        "num": num_results,
        "tbs": f"qdr:{time_range}",
        "gl": location
    })
    headers = {
        'X-API-KEY': os.environ.get("SERPER_API_KEY"),
        'Content-Type': 'application/json'
    }
    logging.info(f"Searching for images with query: {query}")
    response = requests.request("POST", url, headers=headers, data=payload)
    response.raise_for_status()

    json_response = response.json()
    logging.info(f"Found {len(json_response['images'])} images")
    return [item["imageUrl"] for item in json_response["images"]]


def search_linkup(
    query: str,
    num_results: int = 4,
) -> dict:
    """Search for a query using the LinkUp API.

    Args:
        query (str): The query to search for.
        num_results (int): The maximum number of results to return. Default is 4.
        search_context_size (str): The size of the search context. Default is "medium".

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
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()

    json_response = response.json()

    results = json_response.get("results", [])
    urls = [result.get("url") for result in results if result.get("type") == "image"]

    return urls[:num_results]
