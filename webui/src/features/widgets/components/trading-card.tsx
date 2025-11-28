// components/trading-card.tsx
import { useState, useCallback, useMemo } from 'react'
import TradingWidget from '../components/trading-widget'
import { useTrading } from '../hooks/trading'
import type { TimeRange } from '../utils/trading'

type Props = {
  /** List of tickers to switch between */
  symbols?: string[]
  initialRange?: TimeRange
}

export default function TradingCard({
  symbols = ['AAPL', 'MSFT', 'GOOGL'],
  initialRange = '1mo'
}: Props) {
  const [range, setRange] = useState<TimeRange>(initialRange)
  const [activeIdx, setActiveIdx] = useState(0)

  const activeSymbol = useMemo(
    () => (symbols[activeIdx] ?? symbols[0] ?? 'AAPL').toUpperCase(),
    [symbols, activeIdx]
  )

  const { data, isPending, isError } = useTrading({ symbol: activeSymbol, range })

  const handleRangeChange = useCallback((r: TimeRange) => {
    setRange(r)
  }, [])

  const handlePick = useCallback((idx: number) => {
    setActiveIdx(idx)
  }, [])

  if (isPending || isError || !data) return null

  return (
    <div className='w-full space-y-2'>
      {/* Symbol selector */}
      <div className='w-full flex flex-row items-center justify-center gap-4'>
        {symbols.map((sym, idx) => {
          const isActive = idx === activeIdx
          return (
            <button
              key={sym}
              onClick={() => handlePick(idx)}
              className={[
                'relative pb-1 text-xs font-medium transition-colors duration-200',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              ].join(' ')}
            >
              {sym.toUpperCase()}
              <span
                className={[
                  'absolute left-1/2 transform -translate-x-1/2 bottom-0 h-[2px] transition-all duration-200 rounded-full',
                  isActive
                    ? 'w-full bg-primary'
                    : 'w-2/5 bg-border group-hover:w-3/5'
                ].join(' ')}
              />
            </button>
          )
        })}
      </div>

      {/* Active trading widget */}
      <TradingWidget
        data={data}
        rangeLabel={range}
        onRangeChange={handleRangeChange}
      />
    </div>
  )
}