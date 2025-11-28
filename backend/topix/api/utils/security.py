"""Security utils for authentication and authorization."""
import logging

from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
import jwt

from fastapi import Depends, HTTPException, Path, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel

from topix.config.config import Config
from topix.datatypes.user import User
from topix.store.chat import ChatStore
from topix.store.user import UserStore

# access token expire time in minutes (default: 1 day)
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

# refresh token lifetime (example: 7 days)
REFRESH_TOKEN_EXPIRE_DAYS = 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/signin")


class Token(BaseModel):
    """Token model to store generated jwt token."""

    access_token: str
    token_type: str
    # include refresh_token so signin/signup can return it as well
    refresh_token: str | None = None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check that the plain password corresponds to hashed DB password."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    """Hash a password."""
    password_bytes = password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    hashed_str = hashed.decode("utf-8")
    return hashed_str


async def authenticate_user(user_store: UserStore, email: str, password: str) -> User | None:
    """Verify that the user exist and that the password corresponds to the email."""
    user = await user_store.get_user_by_email(email=email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def _encode_jwt(claims: dict, *, minutes: int | None = None, days: int | None = None) -> str:
    """Sign a JWT with optional expiration."""
    config: Config = Config.instance()
    now = datetime.now(timezone.utc)
    exp = now + (
        timedelta(minutes=minutes) if minutes is not None else timedelta(days=days or 0)
    )
    to_encode = {**claims, "exp": exp}
    return jwt.encode(to_encode, config.app.security.secret_key.get_secret_value(), algorithm=config.app.security.algorithm)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Generate an access token (type='access')."""
    if expires_delta:
        minutes = int(expires_delta.total_seconds() // 60)
    else:
        minutes = 15  # fallback
    # add a type claim so we can distinguish tokens
    claims = {**data, "type": "access"}
    return _encode_jwt(claims, minutes=minutes)


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Generate a refresh token (type='refresh')."""
    # default lifetime
    if expires_delta:
        # allow custom delta
        total_minutes = int(expires_delta.total_seconds() // 60)
        days = total_minutes // (60 * 24)
    else:
        days = REFRESH_TOKEN_EXPIRE_DAYS
    claims = {**data, "type": "refresh"}
    return _encode_jwt(claims, days=days)


def decode_and_validate_token(token: str, expected_type: str) -> dict:
    """Decode JWT and ensure 'type' matches expected_type.

    Raises HTTPException 401 on any problem.
    """
    config: Config = Config.instance()
    try:
        payload = jwt.decode(token, config.app.security.secret_key.get_secret_value(), algorithms=[config.app.security.algorithm])
        t = payload.get("type")
        if t != expected_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token type (expected '{expected_type}', got '{t}')",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logging.error("Problem when decoding token: " + str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_uid(request: Request, token: Annotated[str, Depends(oauth2_scheme)]) -> str:
    """Extract the user uid from the *access* token."""
    payload = decode_and_validate_token(token, expected_type="access")
    user_uid = payload.get("sub")
    if user_uid is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has no data",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_uid


async def verify_chat_user(
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
    chat_id: Annotated[str, Path(description="Chat ID")],
) -> None:
    """Verify that the chat belongs to the user in the jwt token."""
    chat_store: ChatStore = request.app.chat_store
    chat = await chat_store.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    if chat.user_uid != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission error")
