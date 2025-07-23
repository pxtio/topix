"""Decorators for timing function execution."""

import inspect
import logging
import time

from functools import wraps

logger = logging.getLogger(__name__)


def timeit(func):
    """Time the execution of a function."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        sig = inspect.signature(func)
        param_names = list(sig.parameters.keys())
        name = func.__name__
        if param_names and param_names[0] == 'self':
            try:
                name = f'{args[0].__class__.__name__}.{name}'
            except Exception:
                pass

        logger.info(
            f'`{name}` took {end - start:.3f} seconds to complete'
        )
        return result
    return wrapper


def async_timeit(func):
    """Time asynchronous functions."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = await func(*args, **kwargs)
        end = time.perf_counter()
        sig = inspect.signature(func)
        param_names = list(sig.parameters.keys())
        name = func.__name__
        if param_names and param_names[0] == 'self':
            try:
                name = f'{args[0].__class__.__name__}.{name}'
            except Exception:
                pass

        logger.info(
            f'`{name}` took {end - start:.3f} seconds to complete'
        )
        return result
    return wrapper
