"""Tools for searching the web."""

import os

from typing import Literal

import requests

from topix.agents.datatypes.annotations import SearchResult
from topix.agents.datatypes.outputs import WebSearchOutput
from topix.agents.datatypes.web_search import WebSearchContextSize


def search_tavily(
    query: str,
    max_results: int = 10,
    search_context_size: WebSearchContextSize = WebSearchContextSize.MEDIUM,
) -> WebSearchOutput:
    """Search for a query using the Tavily API.

    Args:
        query (str): The query to search for.
        max_results (int): The maximum number of results to return. Default is 20.
        search_context_size (str): The size of the search context. Default is "medium".

    Returns:
        str: The results of the search.

    """
    url = "https://api.tavily.com/search"
    api_key = os.environ.get("TAVILY_API_KEY")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    if search_context_size in [WebSearchContextSize.MEDIUM, WebSearchContextSize.LARGE]:
        search_depth = "advanced"
    else:
        search_depth = "basic"
    data = {
        "query": query,
        "max_results": max_results,
        "search_depth": search_depth,
        "auto_parameters": True,
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()

    json_response = response.json()

    results = json_response.get("results", [])

    return WebSearchOutput(
        search_results=[
            SearchResult(
                url=result["url"],
                title=result.get("title", ""),
                content=result.get("content", ""),
            )
            for result in results
        ]
    )


def search_linkup(
    query: str,
    search_context_size: WebSearchContextSize = WebSearchContextSize.MEDIUM,
) -> WebSearchOutput:
    """Search for a query using the LinkUp API.

    Args:
        query (str): The query to search for.
        max_results (int): The maximum number of results to return. Default is 20.
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

    if search_context_size == "large":
        search_depth = "deep"
    else:
        search_depth = "standard"

    data = {
        "q": query,
        "outputType": "searchResults",
        "depth": search_depth,
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()

    json_response = response.json()

    results = json_response.get("results", [])

    return WebSearchOutput(
        search_results=[
            SearchResult(
                url=result["url"],
                title=result.get("name", ""),
                content=result.get("content", ""),
            )
            for result in results
        ]
    )


def navigate(web_url: str, extract_depth: Literal["basic", "advanced"]) -> str:
    """Read the content of a website given its URL.

    Args:
        web_url (str): The URL of the website to read.
        extract_depth (str): The depth of extraction, either "basic" or "advanced".

    Returns:
        str: The full content of the website.

    """
    url = "https://api.tavily.com/extract"
    api_key = os.environ.get("TAVILY_API_KEY")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    data = {
        "urls": web_url,
        "extract_depth": extract_depth,
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()

    raw_content = response.json().get("results", [{}])[0].get("raw_content", "")

    return f"<document url=\"{web_url}\">\n\n{raw_content}\n\n</document>"
