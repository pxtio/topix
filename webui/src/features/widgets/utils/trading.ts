import { apiFetch } from '@/api'
import camelcaseKeys from 'camelcase-keys'

export type TimeRange = '1d' | '5d' | '1mo' | '6mo' | 'ytd' | '1y' | '5y' | 'max'

export type Point = { t: number, v: number }

export interface StockSnapshot {
  ticker: string
  currency: string
  price: number
  change: number
  changePct: number
  prevClose: number
  afterHoursPrice?: number
  afterHoursChange?: number
  afterHoursChangePct?: number
  asOf: string
}

export interface TradingData {
  points: Point[]
  snapshot: StockSnapshot
}

/** Shape from backend (snake_case) */
type BackendSnapshot = {
  ticker: string
  currency: string
  price: number
  change: number
  change_pct: number
  prev_close: number
  after_hours_price?: number
  after_hours_change?: number
  after_hours_change_pct?: number
  as_of: string
}
type BackendData = {
  trading_data: {
    points: Point[]
    snapshot: BackendSnapshot
  }
}

/** Public fetcher used by the hook */
export async function getTrading(
  symbol: string,
  range: TimeRange
): Promise<TradingData> {
  const res = await apiFetch<{ data: BackendData }>({
    path: `/finance/trading`,
    method: 'GET',
    params: { symbol, range }
  })

  // Convert snake_case -> camelCase across the whole payload
  const data = camelcaseKeys(res.data.trading_data, { deep: true }) as {
    points: Point[]
    snapshot: StockSnapshot
  }

  console.log('Fetched trading data:', data)

  return {
    points: data.points ?? [],
    snapshot: data.snapshot
  }
}