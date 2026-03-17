"""Agent input datatypes."""
from pydantic import BaseModel


class MindMapConversionInput(BaseModel):
    """Input for the mind map conversion agent."""

    answer: str
    key_points: str
