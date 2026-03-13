"""User model definition."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from topix.utils.common import gen_uid


class User(BaseModel):
    """User model representing a user in the system."""

    type: Literal["user"] = "user"
    auth_provider: Literal["local", "google", "local_google"] = "local"

    id: int | None = None
    uid: str = Field(default_factory=gen_uid)
    email: EmailStr
    username: str
    name: str | None = None
    password_hash: str | None = None
    google_sub: str | None = None
    google_email: EmailStr | None = None
    google_picture_url: str | None = None
    google_linked_at: datetime | None = None
    email_verified_at: datetime | None = None

    created_at: datetime | None = Field(default_factory=datetime.now)
    updated_at: datetime | None = None
    deleted_at: datetime | None = None
