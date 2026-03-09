"""Email verification token model definition."""

from datetime import datetime

from pydantic import BaseModel, Field

from topix.utils.common import gen_uid


class EmailVerificationToken(BaseModel):
    """Model representing an email verification token row."""

    id: int | None = None
    uid: str = Field(default_factory=gen_uid)
    user_uid: str
    token_hash: str
    expires_at: datetime
    used_at: datetime | None = None

    created_at: datetime | None = Field(default_factory=datetime.now)
    updated_at: datetime | None = None
