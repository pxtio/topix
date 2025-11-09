import { useMemo } from 'react'
import { useQuery, keepPreviousData, type QueryKey } from '@tanstack/react-query'
import { getTrading, type TradingData, type TimeRange } from '../utils/trading'

export type UseTradingParams = {
  symbol?: string
  range?: TimeRange
}

export type UseTradingResult = {
  data?: TradingData
  isPending: boolean
  isError: boolean
  error?: Error
  symbol: string
  range: TimeRange
}

const coerceRange = (v: string | undefined): TimeRange => {
  const allowed: TimeRange[] = ['1d','5d','1mo','6mo','ytd','1y','5y','max']
  return allowed.includes(v as TimeRange) ? (v as TimeRange) : '1d'
}

export const useTrading = (params: UseTradingParams = {}): UseTradingResult => {
  const symbol = useMemo(() => (params.symbol ?? 'AAPL').toUpperCase(), [params.symbol])
  const range = useMemo(() => coerceRange(params.range), [params.range])

  const queryKey: QueryKey = ['trading', { symbol, range }]

  const { data, isPending, isError, error } = useQuery<TradingData, Error>({
    queryKey,
    queryFn: () => getTrading(symbol, range),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false
  })

  return { data, isPending, isError, error: error || undefined, symbol, range }
}