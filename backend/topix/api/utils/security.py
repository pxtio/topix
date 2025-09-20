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


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/signin")


class Token(BaseModel):
    """Token model to store generated jwt token."""

    access_token: str
    token_type: str


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check that the plain password corresponds to hashed DB password."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """Hash a password."""
    password_bytes = password.encode('utf-8')
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    hashed_str = hashed.decode('utf-8')
    return hashed_str


async def authenticate_user(user_store: UserStore, email: str, password: str) -> User | None:
    """Verify that the user exist and that the password corresponds to the email."""
    user = await user_store.get_user_by_email(email=email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Generate an access token with data encrypted."""
    config: Config = Config.instance()
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.app.security.secret_key, algorithm=config.app.security.algorithm)
    return encoded_jwt


async def get_current_user_uid(request: Request, token: Annotated[str, Depends(oauth2_scheme)]) -> str:
    """Extract the user uid from the jwt token."""
    try:
        config: Config = Config.instance()
        payload = jwt.decode(token, config.app.security.secret_key, algorithms=[config.app.security.algorithm])
        user_uid = payload.get("sub")
        if user_uid is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has no data",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.ExpiredSignatureError:
        # Token has expired
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidSignatureError:
        # Imvalid signature
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        # Any other JWT error (bad signature, malformed token, etc.)
        logging.error("Problem when decoding token: " + str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_uid


async def verify_chat_user(
    request: Request,
    current_user_uid: Annotated[str, Depends(get_current_user_uid)],
    chat_id: Annotated[str, Path(description="Chat ID")]
) -> None:
    """Verify that the chat belongs to the user in the jwt token."""
    chat_store: ChatStore = request.app.chat_store
    chat = await chat_store.get_chat(chat_id)
    if chat.user_uid != current_user_uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=" Permission error")
