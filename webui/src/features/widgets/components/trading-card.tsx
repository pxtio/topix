import { useState, useCallback } from 'react'
import TradingWidget from '../components/trading-widget'
import { useTrading } from '../hooks/trading'
import type { TimeRange } from '../utils/trading'

type Props = {
  symbol?: string
  initialRange?: TimeRange
}

export default function TradingCard({
  symbol = 'AAPL',
  initialRange = '1mo'
}: Props) {
  const [range, setRange] = useState<TimeRange>(initialRange)
  const { data, isPending, isError } = useTrading({ symbol, range })

  const handleRangeChange = useCallback((r: TimeRange) => {
    setRange(r)
  }, [])

  if (isPending || isError || !data) return null

  return (
    <div className='w-full'>
      <TradingWidget
        data={data}
        rangeLabel={range}
        onRangeChange={handleRangeChange}
      />
    </div>
  )
}