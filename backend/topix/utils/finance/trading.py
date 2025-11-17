"""Finance utilities for trading data fetching and processing."""
from __future__ import annotations

import math
import random

from datetime import datetime
from typing import Literal, Optional

import httpx

from fastapi import HTTPException
from pydantic import BaseModel

type TimeRange = Literal['1d', '5d', '1mo', '6mo', 'ytd', '1y', '5y', 'max']


class Point(BaseModel):
    """A single time series point."""

    t: int
    v: float


class StockSnapshot(BaseModel):
    """Snapshot of stock trading data."""

    ticker: str
    currency: str
    price: float
    change: float
    change_pct: float
    prev_close: float
    after_hours_price: Optional[float] = None
    after_hours_change: Optional[float] = None
    after_hours_change_pct: Optional[float] = None
    as_of: str


class TradingData(BaseModel):
    """Trading data consisting of time series points and a snapshot."""

    points: list[Point]
    snapshot: StockSnapshot


def _interval_for(range_: TimeRange) -> str:
    if range_ == '1d':
        return '5m'
    if range_ == '5d':
        return '15m'
    if range_ in ('1mo', '6mo', 'ytd', '1y'):
        return '1d'
    if range_ == '5y':
        return '1wk'
    return '1mo'


async def fetch_yahoo_series(symbol: str, range_: TimeRange) -> TradingData:
    """Fetch stock trading data from Yahoo Finance.

    Server-side fetch to Yahoo chart API and transform into { points, snapshot }.
    NOTE: This endpoint is not an official public API. Handle with care.
    """
    ticker = symbol.strip().upper()
    interval = _interval_for(range_)

    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        f"?range={range_}&interval={interval}&includePrePost=true&corsDomain=finance.yahoo.com"
    )

    random_user_agent = random.choice([
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Mozilla/4.0 (compatible; MSIE 6.0; "
        "Windows NT 5.2; .NET CLR 1.0.3705;)"
    ])

    # 🧠 Works best for Yahoo Finance (bypasses 429s)
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Pragma": "no-cache",
        "Referer": f"https://finance.yahoo.com/quote/{ticker}",
        "User-Agent": random_user_agent
    }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Upstream error {response.status_code}")

    data = response.json()
    result = (data.get('chart') or {}).get('result') or []
    if not result:
        raise HTTPException(status_code=502, detail="No chart result")

    payload = result[0]
    timestamps = payload.get('timestamp') or []
    quote = ((payload.get('indicators') or {}).get('quote') or [{}])[0]
    closes = quote.get('close') or []

    # sanitize: align lengths, drop NaNs/None
    points: list[Point] = []
    for i, ts in enumerate(timestamps):
        if i >= len(closes):
            break
        close_value = closes[i]
        if close_value is None or (isinstance(close_value, float) and math.isnan(close_value)):
            continue
        points.append(Point(t=int(ts), v=round(float(close_value), 2)))

    meta = payload.get('meta') or {}
    currency = meta.get('currency') or 'USD'
    prev_close = meta.get('previousClose')
    if not isinstance(prev_close, (int, float)):
        # fallback to first valid close
        prev_close = next((p.v for p in points if isinstance(p.v, (int, float))), 0.0)

    regular_price = meta.get('regularMarketPrice')
    if not isinstance(regular_price, (int, float)):
        regular_price = points[-1].v if points else prev_close

    price = round(float(regular_price), 2)
    prev_close = round(float(prev_close), 2)
    change = round(price - prev_close, 2)
    change_pct = round((change / prev_close) * 100, 2) if prev_close else 0.0

    post_period = (meta.get('currentTradingPeriod') or {}).get('post') or None
    after_price: Optional[float] = points[-1].v if (post_period and points) else None
    after_change: Optional[float] = None
    after_change_pct: Optional[float] = None
    if after_price is not None:
        after_change = round(after_price - price, 2)
        after_change_pct = round((after_change / price) * 100, 2) if price else 0.0

    snapshot = StockSnapshot(
        ticker=ticker,
        currency=currency,
        price=price,
        change=change,
        change_pct=change_pct,
        prev_close=prev_close,
        after_hours_price=after_price,
        after_hours_change=after_change,
        after_hours_change_pct=after_change_pct,
        as_of=datetime.now().isoformat(timespec='seconds'),
    )

    return TradingData(points=points, snapshot=snapshot)
