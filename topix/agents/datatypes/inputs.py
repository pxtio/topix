from pydantic import BaseModel


class QueryRewriteInput(BaseModel):
    query: str
    chat_history: list[dict[str, str]]


class MindMapConversionInput(BaseModel):
    answer: str
    key_points: str
