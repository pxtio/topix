"""User model definition."""

from datetime import datetime

from pydantic import BaseModel, EmailStr


class User(BaseModel):
    """User model representing a user in the system."""

    id: int | None = None
    uid: str
    email: EmailStr
    username: str
    name: str | None = None
    created_at: datetime | None = None
