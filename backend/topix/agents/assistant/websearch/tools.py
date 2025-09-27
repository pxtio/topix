"""Tools for searching the web (async httpx version)."""

import os

from typing import Literal, Optional

import httpx

from agents import FunctionTool, RunContextWrapper, function_tool

from topix.agents.datatypes.annotations import SearchResult
from topix.agents.datatypes.outputs import WebSearchOutput
from topix.agents.datatypes.web_search import WebSearchContextSize, WebSearchOption
from topix.agents.utils.tools import tool_execution_decorator


def _get_env_or_raise(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise RuntimeError(
            f"Missing required environment variable: {key}. "
            f"Please set it before calling this function."
        )
    return value


async def search_perplexity(
    query: str,
    max_results: int = 10,
    search_context_size: WebSearchContextSize = WebSearchContextSize.MEDIUM,
    *,
    client: Optional[httpx.AsyncClient] = None,
    timeout: Optional[httpx.Timeout] = None,
) -> WebSearchOutput:
    """Search for a query using the Perplexity API (async).

    Args:
        query: The query to search for.
        max_results: Maximum number of results to return.
        search_context_size: Size of the search context.
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
        case WebSearchContextSize.SMALL:
            tokens_per_page = 512
        case WebSearchContextSize.MEDIUM:
            tokens_per_page = 1200
        case WebSearchContextSize.LARGE:
            tokens_per_page = 2000

    data = {
        "query": query,
        "max_results": max_results,
        "max_tokens_per_page": tokens_per_page
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
                content=result.get("snippet", ""),
            )
            for result in results
        ]
    )


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
    max_results: int = 10,
    search_context_size: WebSearchContextSize = WebSearchContextSize.MEDIUM,
    *,
    client: Optional[httpx.AsyncClient] = None,
    timeout: Optional[httpx.Timeout] = None,
) -> WebSearchOutput:
    """Search for a query using the LinkUp API (async).

    Args:
        query: The query to search for.
        max_results: Maximum number of results to return.
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
        "outputType": "searchResults",
        "depth": depth,
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
                title=result.get("name", ""),
                content=result.get("content", ""),
            )
            for result in results[:max_results]
        ]
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


def convert_search_func_to_tool(
    name: str,
    search_engine: Literal[WebSearchOption.TAVILY, WebSearchOption.LINKUP],
    max_results: int = 10,
    search_context_size: WebSearchContextSize = WebSearchContextSize.MEDIUM,
    *,
    client: Optional[httpx.AsyncClient] = None,
    timeout: Optional[httpx.Timeout] = None
) -> FunctionTool:
    """Convert a search function to a tool."""
    if search_engine == WebSearchOption.TAVILY:
        search_func = search_tavily
    elif search_engine == WebSearchOption.LINKUP:
        search_func = search_linkup
    elif search_engine == WebSearchOption.PERPLEXITY:
        search_func = search_perplexity
    else:
        raise ValueError(f"Invalid search engine: {search_engine}")

    @function_tool(name_override=name)
    @tool_execution_decorator(tool_name=name)
    async def web_search(wrapper: RunContextWrapper, query: str) -> WebSearchOutput:
        return await search_func(
            query,
            max_results=max_results,
            search_context_size=search_context_size,
            client=client,
            timeout=timeout
        )

    return web_search
