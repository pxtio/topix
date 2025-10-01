"""Helpers to create web search tools."""
from agents import Tool

from topix.agents.assistant.websearch.broad import BroadWebSearch
from topix.agents.assistant.websearch.tools import convert_search_func_to_tool
from topix.agents.config import WebSearchConfig
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.datatypes.web_search import WebSearchOption


def make_web_search_tool(
    web_search: BroadWebSearch | Tool
) -> Tool:
    """Create a web search tool from a BroadWebSearch instance or a Tool."""
    if isinstance(web_search, BroadWebSearch):
        web_search = web_search.as_tool(
            AgentToolName.WEB_SEARCH,
            streamed=True
        )
    return web_search


def make_web_search_tool_from_config(
    config: WebSearchConfig
) -> Tool:
    """Create a web search tool from configuration."""
    engine = config.search_engine
    if engine in [WebSearchOption.OPENAI]:
        return make_web_search_tool(BroadWebSearch.from_config(config))

    return convert_search_func_to_tool(
        name=AgentToolName.WEB_SEARCH,
        search_engine=engine,
        max_results=config.max_results,
        search_context_size=config.search_context_size
    )
