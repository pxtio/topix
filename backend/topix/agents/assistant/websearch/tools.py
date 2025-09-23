"""Tools for searching the web (async httpx version)."""

import os
import re

from typing import Literal, Optional

import httpx

from topix.agents.datatypes.annotations import SearchResult
from topix.agents.datatypes.outputs import WebSearchOutput
from topix.agents.datatypes.web_search import WebSearchContextSize


def _get_env_or_raise(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {key}. "
            f"Please set it before calling this function."
        )
    return value


async def search_tavily(
    query: str,
    max_results: int = 10,
    search_context_size: WebSearchContextSize = WebSearchContextSize.MEDIUM,
    *,
    client: Optional[httpx.AsyncClient] = None,
    timeout: Optional[httpx.Timeout] = None,
) -> WebSearchOutput:
    """Search for a query using the Tavily API (async).

    Args:
        query: The query to search for.
        max_results: Maximum number of results to return.
        search_context_size: Size of the search context.
        client: Optional shared httpx.AsyncClient to reuse.
        timeout: Optional httpx timeout (per-request).

    Returns:
        WebSearchOutput

    """
    url = "https://api.tavily.com/search"
    api_key = _get_env_or_raise("TAVILY_API_KEY")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    search_depth = "advanced" if search_context_size in (
        WebSearchContextSize.MEDIUM,
        WebSearchContextSize.LARGE,
    ) else "basic"

    data = {
        "query": query,
        "max_results": max_results,
        "search_depth": search_depth,
        "auto_parameters": True,
    }

    if client is None:
        async with httpx.AsyncClient() as ac:
            resp = await ac.post(url, headers=headers, json=data, timeout=timeout)
    else:
        resp = await client.post(url, headers=headers, json=data, timeout=timeout)

    resp.raise_for_status()
    json_response = resp.json()
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


async def search_linkup(
    query: str,
    search_context_size: WebSearchContextSize = WebSearchContextSize.MEDIUM,
    *,
    client: Optional[httpx.AsyncClient] = None,
    timeout: Optional[httpx.Timeout] = None,
) -> WebSearchOutput:
    """Search for a query using the LinkUp API (async).

    Args:
        query: The query to search for.
        search_context_size: Size of the search context.
        client: Optional shared httpx.AsyncClient to reuse.
        timeout: Optional httpx timeout (per-request).

    Returns:
        WebSearchOutput

    """
    url = "https://api.linkup.so/v1/search"
    api_key = _get_env_or_raise("LINKUP_API_KEY")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    # Use enum to determine depth (fixing prior string comparison)
    depth = "deep" if search_context_size == WebSearchContextSize.LARGE else "standard"

    data = {
        "q": query,
        "outputType": "sourcedAnswer",
        "depth": depth,
        "includeInlineCitations": True
    }

    if client is None:
        async with httpx.AsyncClient() as ac:
            resp = await ac.post(url, headers=headers, json=data, timeout=timeout)
    else:
        resp = await client.post(url, headers=headers, json=data, timeout=timeout)
    resp.raise_for_status()
    json_response = resp.json()
    results = json_response.get("results", [])

    def _extract_source_ids(text: str) -> set[int]:
        ids = [int(i) for i in re.findall(r'\[(\d+)\]', text)]
        return set(ids)

    answer = json_response.get("answer", "")
    source_ids = _extract_source_ids(answer)
    hits = []
    for idx in source_ids:
        if idx < 1 or idx > len(results):
            continue
        hit = SearchResult(
            url=results[idx - 1]["url"],
            title=results[idx - 1].get("title", ""),
            content=results[idx - 1].get("content", "")
        )
        answer = answer.replace(f'[{idx}]', f'[{hit.title}]({hit.url})')
    return WebSearchOutput(
        answer=answer,
        search_results=hits
    )


async def navigate(
    web_url: str,
    extract_depth: Literal["basic", "advanced"],
    *,
    client: Optional[httpx.AsyncClient] = None,
    timeout: Optional[httpx.Timeout] = None,
) -> str:
    """Read the content of a website via Tavily Extract API (async).

    Args:
        web_url: The URL to read.
        extract_depth: "basic" or "advanced".
        client: Optional shared httpx.AsyncClient to reuse.
        timeout: Optional httpx timeout (per-request).

    Returns:
        str: An XML-ish string containing the raw content.

    """
    url = "https://api.tavily.com/extract"
    api_key = _get_env_or_raise("TAVILY_API_KEY")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    data = {
        "urls": web_url,          # kept consistent with your original code
        "extract_depth": extract_depth,
    }

    if client is None:
        async with httpx.AsyncClient() as ac:
            resp = await ac.post(url, headers=headers, json=data, timeout=timeout)
    else:
        resp = await client.post(url, headers=headers, json=data, timeout=timeout)

    resp.raise_for_status()
    raw_content = resp.json().get("results", [{}])[0].get("raw_content", "")

    return f'<document url="{web_url}">\n\n{raw_content}\n\n</document>'
