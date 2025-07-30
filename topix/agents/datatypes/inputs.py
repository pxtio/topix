"""Agent input datatypes."""
from pydantic import BaseModel


class QueryRewriteInput(BaseModel):
    """Input for the query rewrite agent."""

    query: str
    chat_history: list[dict[str, str]]


class MindMapConversionInput(BaseModel):
    """Input for the mind map conversion agent."""

    answer: str
    key_points: str
