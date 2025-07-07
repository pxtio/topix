from pydantic import BaseModel


class EdgeData(BaseModel):
    label: str | None = None
