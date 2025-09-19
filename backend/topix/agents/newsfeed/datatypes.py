"""Simple news feed data types."""

from __future__ import annotations

from pydantic import BaseModel  # , field_validator


from typing import List, Optional, Literal
# from datetime import datetime


class Subscription(BaseModel):
    label: str
    keywords: Optional[List[str]] = None
    description: Optional[str] = None  # User-defined; can be auto-generated if not provided
    domains: Optional[List[str]] = None
    recurrence: Literal["hour", "day", "week", "month"] = "week"
    language: Literal["English", "French"] = "English"


class Source(BaseModel):
    url: str
    summary: str
    date: str  # ISO format enforced

    # @field_validator("date")
    # @classmethod
    # def validate_date_isoformat(cls, v):
    #     try:
    #         # Accepts both date and datetime ISO formats
    #         datetime.fromisoformat(v)
    #     except ValueError:
    #         raise ValueError("date must be in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)")
    #     return v


class Domain(BaseModel):
    name: str
    score: float


class Newsletter(BaseModel):
    sources: List[Source]
    report: str  # markdown
    domains: Optional[List[str]] = None
