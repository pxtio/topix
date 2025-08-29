"""User model definition."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from src.utils.common import gen_uid


class User(BaseModel):
    """User model representing a user in the system."""

    type: Literal["user"] = "user"

    id: int | None = None
    uid: str = Field(default_factory=gen_uid)
    email: EmailStr
    username: str
    name: str | None = None

    created_at: datetime | None = Field(default_factory=datetime.now)
    updated_at: datetime | None = None
    deleted_at: datetime | None = None
