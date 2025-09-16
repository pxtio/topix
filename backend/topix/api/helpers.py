"""Helper functions for API responses."""
import logging
from functools import wraps
from typing import Any, AsyncGenerator, Awaitable, Callable, TypeVar

from fastapi import HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)


def with_standard_response(func: Callable[..., Awaitable[Any]]) -> Callable[..., Awaitable[Any]]:
    """Standardize API responses."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        response: Response = kwargs.get("response")  # Injected by FastAPI
        try:
            result = await func(*args, **kwargs)

            if result:
                if response:
                    response.status_code = 200
                return {"status": "success", "data": result}
            else:
                if response:
                    response.status_code = 200
                return {"status": "success"}

        except HTTPException as http_exc:
            # Preserve HTTPException's status code and message
            if response:
                response.status_code = http_exc.status_code
            return {
                "status": "error",
                "data": {"message": http_exc.detail}
            }

        except Exception as e:
            logger.error(f"Error in {func.__name__}: {str(e)}", exc_info=True)
            if response:
                response.status_code = 500
            return {
                "status": "error",
                "data": {"message": "Internal server error", "details": str(e)}
            }

    return wrapper


T = TypeVar("T", bound=BaseModel)


def with_streaming(
    async_func: Callable[..., AsyncGenerator[T, None]]
) -> Callable[..., StreamingResponse]:
    """Handle streaming responses.

    This decorator wraps an async function to yield JSON responses line by line.
    The async function should yield data in pydantic's BaseModel format.
    """
    @wraps(async_func)
    async def wrapper(*args, **kwargs):
        async def wrapped_generator():
            async for item in async_func(*args, **kwargs):
                yield item.model_dump_json(exclude_none=True) + "\n"
        return StreamingResponse(wrapped_generator(), media_type="text/event-stream")
    return wrapper
