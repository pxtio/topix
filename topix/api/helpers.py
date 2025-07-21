import logging

logger = logging.getLogger(__name__)


async def format_response(async_func, *args, **kwargs) -> dict:
    """Format the response from an async function."""
    try:
        result = await async_func(*args, **kwargs)
        if result:
            return {"status": "success", "data": result}
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error in {async_func.__name__}: {str(e)}", exc_info=True)
        return {"status": "error", "data": {"message": str(e)}}
