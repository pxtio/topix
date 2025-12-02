"""Tools for searching the web (async httpx version)."""

import asyncio
import os

from typing import Literal, Optional

import httpx

from topix.agents.datatypes.annotations import SearchResult
from topix.agents.datatypes.outputs import WebSearchOutput
from topix.agents.datatypes.web_search import WebSearchContextSize
from topix.agents.websearch.utils import get_from_date
from topix.datatypes.recurrence import Recurrence
from topix.utils.retry import async_retry

semaphore = asyncio.Semaphore(100)  # limit concurrent requests to 100


def _get_env_or_raise(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {key}. "
            f"Please set it before calling this function."
        )
    return value


@async_retry(retries=3, delay_ms=1000, exceptions=(httpx.HTTPError,))
async def search_perplexity(
    query: str,
    max_results: int = 10,
    search_context_size: WebSearchContextSize = WebSearchContextSize.MEDIUM,
    recency: Recurrence | None = None,
    *,
    client: Optional[httpx.AsyncClient] = None,
    timeout: Optional[httpx.Timeout] = None,
) -> WebSearchOutput:
    """Search for a query using the Perplexity API (async).

    Args:
        query: The query to search for.
        max_results: Maximum number of results to return.
        search_context_size: Size of the search context.
        recency: Optional Recurrence filter. Returns results from the last 'daily', 'weekly', 'monthly', or 'yearly'.
        client: Optional shared httpx.AsyncClient to reuse.
        timeout: Optional httpx timeout (per-request).

    Returns:
        WebSearchOutput

    """
    url = "https://api.perplexity.ai/search"
    api_key = _get_env_or_raise("PERPLEXITY_API_KEY")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    tokens_per_page = 1024  # default value
    match search_context_size:
        case WebSearchContextSize.LOW:
            tokens_per_page = 512
        case WebSearchContextSize.MEDIUM:
            tokens_per_page = 1200
        case WebSearchContextSize.HIGH:
            tokens_per_page = 2000

    data = {
        "query": query,
        "max_results": max_results,
        "max_tokens_per_page": tokens_per_page
    }

    if recency:
        match recency:
            case Recurrence.DAILY:
                recency_filter = "day"
            case Recurrence.WEEKLY:
                recency_filter = "week"
            case Recurrence.MONTHLY:
                recency_filter = "month"
            case Recurrence.YEARLY:
                recency_filter = "year"
            case _:
                raise ValueError(f"Invalid recency: {recency}. Must be one of 'daily', 'weekly', 'monthly', 'yearly'.")
        data["search_recency_filter"] = recency_filter

    async with semaphore:
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
                content=result.get("snippet", ""),
            )
            for result in results
        ]
    )


@async_retry(retries=3, delay_ms=1000, exceptions=(httpx.HTTPError,))
async def search_tavily(
    query: str,
    max_results: int = 10,
    search_context_size: WebSearchContextSize = WebSearchContextSize.MEDIUM,
    recency: Recurrence | None = None,
    *,
    client: Optional[httpx.AsyncClient] = None,
    timeout: Optional[httpx.Timeout] = None,
) -> WebSearchOutput:
    """Search for a query using the Tavily API (async).

    Args:
        query: The query to search for.
        max_results: Maximum number of results to return.
        search_context_size: Size of the search context.
        recency: Optional Recurrence filter. Returns results from the last 'daily', 'weekly', 'monthly', or 'yearly'.
            If not specified, no date filtering will be applied. Default is None (i.e., no filtering).
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
        WebSearchContextSize.HIGH,
    ) else "basic"

    data = {
        "query": query,
        "max_results": max_results,
        "search_depth": search_depth,
        "auto_parameters": True,
    }

    if recency:
        from_date = get_from_date(recency).isoformat()
        data["start_date"] = from_date

    async with semaphore:
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


@async_retry(retries=3, delay_ms=1000, exceptions=(httpx.HTTPError,))
async def search_linkup(
    query: str,
    max_results: int = 10,
    search_context_size: WebSearchContextSize = WebSearchContextSize.MEDIUM,
    recency: Recurrence | None = None,
    *,
    client: Optional[httpx.AsyncClient] = None,
    timeout: Optional[httpx.Timeout] = None,
) -> WebSearchOutput:
    """Search for a query using the LinkUp API (async).

    Args:
        query: The query to search for.
        max_results: Maximum number of results to return.
        search_context_size: Size of the search context.
        recency: Optional Recurrence filter. Returns results from the last 'daily', 'weekly', 'monthly', or 'yearly'.
            If not specified, no date filtering will be applied. Default is None (i.e., no filtering).
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
    depth = "deep" if search_context_size == WebSearchContextSize.HIGH else "standard"

    data = {
        "q": query,
        "outputType": "searchResults",
        "depth": depth,
    }

    if recency:
        from_date = get_from_date(recency).isoformat()
        data["fromDate"] = from_date

    async with semaphore:
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
                title=result.get("name", ""),
                content=result.get("content", ""),
            )
            for result in results[:max_results]
        ]
    )


@async_retry(retries=3, delay_ms=1000, exceptions=(httpx.HTTPError,))
async def search_exa(
    query: str,
    max_results: int = 10,
    search_context_size: WebSearchContextSize = WebSearchContextSize.MEDIUM,
    recency: Recurrence | None = None,
    *,
    client: Optional[httpx.AsyncClient] = None,
    timeout: Optional[httpx.Timeout] = None,
) -> WebSearchOutput:
    """Search for a query using the Exa API (async).

    Args:
        query: The query to search for.
        max_results: Maximum number of results to return (capped at Exa's limit of 100).
        search_context_size: Size of the search context. HIGH maps to Exa "deep" search,
            everything else uses "auto" (fast + neural combo).
        recency: Optional Recurrence filter. Returns results from the last 'daily',
            'weekly', 'monthly', or 'yearly'. If not specified, no date filtering.
        client: Optional shared httpx.AsyncClient to reuse.
        timeout: Optional httpx timeout (per-request).

    Returns:
        WebSearchOutput

    """
    url = "https://api.exa.ai/search"
    api_key = _get_env_or_raise("EXA_API_KEY")

    # Exa supports x-api-key or Authorization: Bearer
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
    }

    # Map your context size to Exa search type
    # HIGH -> "deep" (more comprehensive)
    # others -> "auto" (sensible default: neural + other methods)
    if search_context_size == WebSearchContextSize.HIGH:
        exa_type = "deep"
    else:
        exa_type = "fast"

    # Respect Exa's max 100 results limit
    num_results = min(max_results, 100)

    data: dict = {
        "query": query,
        "type": exa_type,
        "numResults": num_results,
        "contents": {
            "context": True
        }
    }

    # Optional recency filter -> Exa startPublishedDate (ISO 8601)
    if recency:
        from_date = get_from_date(recency).isoformat()
        data["startPublishedDate"] = from_date

    async with semaphore:
        if client is None:
            async with httpx.AsyncClient() as ac:
                resp = await ac.post(url, headers=headers, json=data, timeout=timeout)
        else:
            resp = await client.post(url, headers=headers, json=data, timeout=timeout)

    resp.raise_for_status()
    json_response = resp.json()
    results = json_response.get("results", []) or []

    # Exa returns fields like: title, url, text, summary, etc.
    search_results: list[SearchResult] = []
    for result in results[:max_results]:
        content = (
            result.get("text")
            or result.get("summary")
            or ""
        )

        search_results.append(
            SearchResult(
                url=result["url"],
                title=result.get("title", ""),
                content=content,
                favicon=result.get("favicon"),
                published_at=result.get("publishedDate"),
                cover_image=result.get("image") or None
            )
        )

    return WebSearchOutput(search_results=search_results, answer=json_response.get("context", ""))


@async_retry(retries=3, delay_ms=1000, exceptions=(httpx.HTTPError,))
async def fetch_content(
    web_url: str,
    extract_depth: Literal["basic", "advanced"] = "basic",
    *,
    client: Optional[httpx.AsyncClient] = None,
    timeout: Optional[httpx.Timeout] = None,
) -> WebSearchOutput:
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

    async with semaphore:
        if client is None:
            async with httpx.AsyncClient() as ac:
                resp = await ac.post(url, headers=headers, json=data, timeout=timeout)
        else:
            resp = await client.post(url, headers=headers, json=data, timeout=timeout)

    resp.raise_for_status()
    raw_content = resp.json().get("results", [{}])[0].get("raw_content", "")

    return WebSearchOutput(
        search_results=[
            SearchResult(
                url=web_url,
                content=raw_content,
            )
        ]
    )
