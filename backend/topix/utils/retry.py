"""Asynchronous retry decorator."""
import asyncio

from functools import wraps


def async_retry(retries=3, delay_ms=200, exceptions=(Exception,)):
    """Asynchronous retry decorator."""
    delay = delay_ms / 1000.0

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_err = None
            for attempt in range(retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_err = e
                    if attempt < retries:
                        await asyncio.sleep(delay)
                    else:
                        raise last_err
        return wrapper
    return decorator
