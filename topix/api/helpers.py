async def format_response(async_func, *args, **kwargs) -> dict:
    """Format the response from an async function."""
    try:
        result = await async_func(*args, **kwargs)
        if result:
            return {"status": "success", "data": result}
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "data": {"message": str(e)}}
