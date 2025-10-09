"""Resilient streaming response decorator for FastAPI."""
import asyncio
import json

from functools import wraps
from typing import Any, AsyncGenerator, Callable, TypeVar

from fastapi import Request
from fastapi.responses import StreamingResponse

T = TypeVar("T")


def _serialize_ndjson_str(item: Any) -> str:
    """Serialize item to JSON string (newline not included)."""
    if hasattr(item, "model_dump_json"):
        # pydantic v2
        return item.model_dump_json(exclude_none=True)
    if hasattr(item, "json"):
        # pydantic v1
        return item.json(exclude_none=True)  # type: ignore
    if isinstance(item, (dict, list)):
        return json.dumps(item, ensure_ascii=False)
    return str(item)


def with_streaming_resilient_ndjson(  # noqa: C901
    *,
    media_type: str = "application/x-ndjson",  # or "application/json"
    queue_maxsize: int = 128,                  # bounded buffer to prevent leaks
    continue_on_disconnect: bool = True,       # producer survives client disconnect
    serializer: Callable[[Any], str] = _serialize_ndjson_str,
) -> Callable[[Callable[..., AsyncGenerator[T, None]]], Callable[..., StreamingResponse]]:
    """Stream without breaking on client disconnect.

    Minimal NDJSON streaming decorator:
      - The first argument of the endpoint **must be `request: Request`.**
      - Keeps producer alive even if client disconnects.
      - Streams one JSON object per line.
      - Uses a bounded queue with drop-oldest to avoid blocking.
    """
    def decorator(async_func: Callable[..., AsyncGenerator[T, None]]):  # noqa: C901
        """Wrap streaming function."""
        @wraps(async_func)
        async def wrapper(request: Request, *args, **kwargs) -> StreamingResponse:  # noqa: C901
            """Execute code (wrapped function)."""
            q: asyncio.Queue = asyncio.Queue(maxsize=queue_maxsize)
            end = object()

            async def _enqueue(line: str) -> None:
                # Non-blocking enqueue; drop oldest if full.
                try:
                    q.put_nowait(line)
                except asyncio.QueueFull:
                    try:
                        _ = q.get_nowait()
                    except Exception:
                        pass
                    q.put_nowait(line)

            async def producer():
                try:
                    async for item in async_func(request, *args, **kwargs):
                        await _enqueue(serializer(item) + "\n")
                except Exception as e:
                    try:
                        await _enqueue(json.dumps({"error": str(e)}) + "\n")
                    except Exception:
                        pass
                finally:
                    await q.put(end)

            # Run producer independently so it’s not cancelled on disconnect
            producer_task = asyncio.create_task(producer())

            async def gen():
                try:
                    while True:
                        if await request.is_disconnected():
                            if not continue_on_disconnect:
                                producer_task.cancel()
                            break
                        item = await q.get()
                        if item is end:
                            break
                        yield item  # already includes newline
                except asyncio.CancelledError:
                    # Just stop sending; producer keeps running
                    raise

            return StreamingResponse(gen(), media_type=media_type)

        if hasattr(async_func, "dependant"):
            wrapper.dependant = async_func.dependant  # type: ignore[attr-defined]
        return wrapper

    return decorator
