import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, Clock, Info } from 'lucide-react'
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  type TooltipProps
} from 'recharts'
import type { TradingData, Point, TimeRange } from '../utils/trading'

const ranges: TimeRange[] = ['1d','5d','1mo','6mo','ytd','1y','5y','max']

const formatNumber = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)

const formatDelta = (n: number, pct: number) => {
  const pos = n >= 0
  const Icon = pos ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 ${pos ? 'text-emerald-400' : 'text-rose-400'}`}>
      <Icon className='w-3 h-3' />
      {`${pos ? '+' : ''}${formatNumber(n)} (${pct.toFixed(2)}%)`}
    </span>
  )
}

const formatTick = (t: number, rangeLabel: string) => {
  const d = new Date(t * 1000)
  if (rangeLabel === '1d') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (rangeLabel === '5d' || rangeLabel === '1mo') return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  if (rangeLabel === '6mo' || rangeLabel === 'ytd' || rangeLabel === '1y') return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return d.toLocaleDateString([], { month: 'short', year: '2-digit' })
}

type RechartsPayload = { payload: Point }
type RechartsTooltipProps = TooltipProps<number, string> & { payload?: RechartsPayload[] }

const makeCustomTooltip =
  (rangeLabel: string) =>
  ({ active, payload }: RechartsTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null
    const p = payload[0].payload
    const d = new Date(p.t * 1000)
    const label =
      rangeLabel === '1d'
        ? d.toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : d.toLocaleString()
    return (
      <div className='rounded-lg border bg-background/95 px-3 py-2 shadow-sm text-xs'>
        <div className='text-muted-foreground'>Price • {p.v.toFixed(2)}</div>
        <div className='text-muted-foreground'>Time • {label}</div>
      </div>
    )
  }

export default function TradingWidget({
  data,
  rangeLabel = '1d',
  onRangeChange
}: {
  data: TradingData
  rangeLabel?: TimeRange
  /** If provided, widget becomes controlled for range and calls this on change */
  onRangeChange?: (r: TimeRange) => void
}) {
  // Uncontrolled fallback so the widget still works standalone for demos
  const [internalRange, setInternalRange] = useState<TimeRange>(rangeLabel)
  const currentRange = useMemo<TimeRange>(
    () => (onRangeChange ? rangeLabel : internalRange),
    [onRangeChange, rangeLabel, internalRange]
  )

  const { points, snapshot } = data

  const handlePick = (r: TimeRange) => {
    if (onRangeChange) onRangeChange(r)
    else setInternalRange(r)
  }

  return (
    <div className='bg-sidebar rounded-xl p-4 md:p-5 shadow-md w-full'>
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-1'>
          <div className='text-[11px] md:text-xs uppercase tracking-wide text-accent-foreground font-medium'>
            {snapshot.ticker}
          </div>
          <div className='text-2xl md:text-3xl font-semibold tracking-tight font-mono tabular-nums'>
            {formatNumber(snapshot.price)}{' '}
            <span className='text-xs md:text-sm align-middle text-muted-foreground font-sans'>
              {snapshot.currency}
            </span>
          </div>
          <div className='text-xs md:text-sm'>
            {formatDelta(snapshot.change, snapshot.changePct)}{' '}
            <span className='text-muted-foreground'>today</span>
          </div>
          <div className='flex items-center gap-1 text-xs text-muted-foreground'>
            <Clock className='w-3 h-3' />
            <span>Updated • {snapshot.asOf}</span>
            <span className='mx-1'>•</span>
            <button className='inline-flex items-center gap-1 hover:underline'>
              <Info className='w-3 h-3' />
              Disclaimer
            </button>
          </div>
          <div className='text-xs font-mono tabular-nums flex items-center gap-2 text-muted-foreground'>
            <span>After hours</span>
            <span className='font-medium'>
              {formatNumber(snapshot.afterHoursPrice ?? snapshot.price)} {snapshot.currency}
            </span>
            {snapshot.afterHoursChange != null && (
              <span>
                {formatDelta(snapshot.afterHoursChange, snapshot.afterHoursChangePct ?? 0)}
              </span>
            )}
          </div>
        </div>

        {/* Range selector (compact, same vibe) */}
        <div className='flex flex-wrap gap-1.5 self-start'>
          {ranges.map(r => (
            <button
              key={r}
              onClick={() => handlePick(r)}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border transition
                ${r === currentRange
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'text-muted-foreground hover:text-foreground border-transparent hover:border-border'}`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className='mt-2 rounded-lg border border-border overflow-hidden'>
        <div className='h-[190px]'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <defs>
                <linearGradient id='areaFill' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='currentColor' stopOpacity={0.12} />
                  <stop offset='100%' stopColor='currentColor' stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray='3 3' stroke='var(--border)' opacity={0.35} />
              <XAxis
                dataKey='t'
                tickFormatter={(t) => formatTick(t as number, currentRange)}
                minTickGap={28}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontFamily: 'var(--font-sans)', fill: 'var(--muted-foreground)' }}
              />
              <YAxis dataKey='v' hide domain={['dataMin', 'dataMax']} />
              <Tooltip
                content={makeCustomTooltip(currentRange)}
                cursor={{ stroke: 'currentColor', strokeOpacity: 0.4, strokeDasharray: '3 3' }}
                wrapperStyle={{ outline: 'none' }}
              />
              <ReferenceLine
                y={snapshot.prevClose}
                stroke='var(--border)'
                strokeDasharray='4 4'
                ifOverflow='extendDomain'
              />
              <Area type='monotone' dataKey='v' stroke='currentColor' strokeWidth={2} fill='url(#areaFill)' />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className='mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs'>
        <div className='space-y-1'>
          <div className='text-muted-foreground'>Open</div>
          <div className='font-medium font-mono tabular-nums'>{points[0]?.v?.toFixed(2)}</div>
        </div>
        <div className='space-y-1'>
          <div className='text-muted-foreground'>High</div>
          <div className='font-medium font-mono tabular-nums'>
            {Math.max(...points.map((p) => p.v)).toFixed(2)}
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-muted-foreground'>Low</div>
          <div className='font-medium font-mono tabular-nums'>
            {Math.min(...points.map((p) => p.v)).toFixed(2)}
          </div>
        </div>
        <div className='space-y-1'>
          <div className='text-muted-foreground'>Prev close</div>
          <div className='font-medium font-mono tabular-nums'>{snapshot.prevClose.toFixed(2)}</div>
        </div>
      </div>
    </div>
  )
}