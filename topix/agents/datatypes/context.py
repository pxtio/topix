import asyncio

from pydantic import BaseModel, PrivateAttr


class ReasoningContext(BaseModel):
    """Agent context for managing state and results."""

    search_results_limit: int = 5

    kb_search_results: list[str] = []
    web_search_results: list[str] = []

    _message_queue: asyncio.Queue = PrivateAttr(default_factory=asyncio.Queue)
