"""FastAPI dependency entrypoint for rate limiting."""

from typing import Annotated

from fastapi import Depends, Request

from topix.api.utils.rate_limit.service import enforce_rate_limit
from topix.api.utils.security import get_current_user_uid


async def rate_limiter(
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
) -> None:
    """Dependency used by routes to enforce API limits."""
    await enforce_rate_limit(request, user_id)
