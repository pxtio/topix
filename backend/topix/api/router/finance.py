"""Finance API router."""
from fastapi import APIRouter, Depends, Request, Response

from topix.api.utils.decorators import with_standard_response
from topix.api.utils.security import get_current_user_uid
from topix.utils.finance.trading import fetch_yahoo_series

router = APIRouter(
    prefix="/finance",
    tags=["finance"],
    responses={404: {"description": "Not found"}},
    dependencies=[Depends(get_current_user_uid)],
)


@router.get("/trading/", include_in_schema=False)
@router.get("/trading")
@with_standard_response
async def get_trading_data(
    response: Response,
    request: Request,
    symbol: str,
    range: str = "1d"
):
    """Get trading symbols matching a query."""
    data = await fetch_yahoo_series(symbol, range)
    return {"trading_data": data.model_dump(exclude_none=True)}
