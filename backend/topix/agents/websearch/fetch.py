"""Url fetching tool for web search agent."""
from agents import RunContextWrapper

from topix.agents.datatypes.context import Context
from topix.agents.datatypes.tools import AgentToolName, tool_descriptions
from topix.agents.tool_handler import ToolHandler
from topix.agents.websearch.tools import fetch_content

MAX_FETCH_CONTENT_CHARS = 20_000


def _truncate_content(text: str, max_chars: int = MAX_FETCH_CONTENT_CHARS) -> str:
    """Limit fetched content size to keep tool context bounded and predictable."""
    if len(text) <= max_chars:
        return text

    truncated = text[:max_chars]
    return f"{truncated}\n\n[TRUNCATED at {max_chars} chars from {len(text)} chars]"


async def fetch_url(
    wrapper: RunContextWrapper[Context],
    url: str
) -> str:
    """Fetch the content of a URL.

    Args:
        wrapper: The context wrapper for the agent run.
        url: The URL to fetch.

    Returns:
        str: The content of the URL. If fetching fails, returns a message indicating the failure.

    """
    try:
        content = await fetch_content(url, extract_depth="basic")
        content = _truncate_content(str(content))
        return (
            f"<UrlContent"
            f"\n\turl='{url}'"
            ">\n\n"
            f"{content}"
            "\n\n</UrlContent>"
        )

    except Exception as e:
        return (
            f"Failed to fetch content from {url}: {e}. "
            "Whether the URL is not reachable or invalid or the content cannot be extracted."
        )


fetch_url_content_tool = ToolHandler.convert_func_to_tool(
    fetch_url,
    tool_name=AgentToolName.NAVIGATE,
    tool_description=tool_descriptions[AgentToolName.NAVIGATE]
)
