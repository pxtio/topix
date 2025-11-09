/**
 * components/weather-widget.tsx
 *
 * A compact, translucent "liquid glass" weather widget with a subtle dot texture.
 * Uses shadcn/ui colors for full theme support (light/dark aware).
 */

import { motion } from 'framer-motion'
import {
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  Sun,
  CloudSun,
  Cloud,
  MapPin,
  Clock,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export type HourPoint = { t: string | number | Date; temp: number }
export type DailyForecast = {
  dow: string
  high: number
  low: number
  icon: WeatherKind
}

export type WeatherKind =
  | 'sunny'
  | 'partly'
  | 'cloudy'
  | 'drizzle'
  | 'rain'
  | 'snow'

export type WeatherWidgetProps = {
  location: string
  asOf: string
  unit?: 'C' | 'F'
  current: {
    temp: number
    kind: WeatherKind
    description?: string
  }
  hourly: HourPoint[]
  daily: DailyForecast[]
}

function iconFor(kind: WeatherKind, className = 'w-5 h-5') {
  switch (kind) {
    case 'sunny':
      return <Sun className={className} />
    case 'partly':
      return <CloudSun className={className} />
    case 'cloudy':
      return <Cloud className={className} />
    case 'drizzle':
      return <CloudDrizzle className={className} />
    case 'rain':
      return <CloudRain className={className} />
    case 'snow':
      return <CloudSnow className={className} />
  }
}

function prettyTemp(n: number, unit: 'C' | 'F' = 'C') {
  return `${Math.round(n)}°${unit}`
}

/** format numeric hour (0–23) to 'h AM/PM' */
function hourToAmPm(h: number) {
  const hour = ((Math.floor(h) % 24) + 24) % 24
  const h12 = hour % 12 || 12
  const suffix = hour < 12 ? 'AM' : 'PM'
  return `${h12} ${suffix}`
}

/**
 * Robust formatter for X-axis & tooltip labels.
 * - '9 AM' / '3 pm' → returns as-is (normalized casing)
 * - 0..23 or '0'..'23' → converts to AM/PM
 * - ISO/timestamp/Date → formats to AM/PM
 * - anything else → returns original
 */
function formatTimeLabel(v: unknown) {
  if (v instanceof Date) return v.toLocaleTimeString([], { hour: 'numeric', hour12: true })

  if (typeof v === 'number') {
    if (v >= 0 && v <= 23) return hourToAmPm(v)
    const d = new Date(v)
    return isNaN(d.getTime()) ? String(v) : d.toLocaleTimeString([], { hour: 'numeric', hour12: true })
  }

  if (typeof v === 'string') {
    const s = v.trim()
    // already like "9 AM" / "3 pm"
    if (/(am|pm)\b/i.test(s)) return s.toUpperCase()
    // numeric hour string
    const n = Number(s)
    if (!Number.isNaN(n) && n >= 0 && n <= 23) return hourToAmPm(n)
    // try ISO/date string
    const d = new Date(s)
    return isNaN(d.getTime()) ? s : d.toLocaleTimeString([], { hour: 'numeric', hour12: true })
  }

  return String(v ?? '')
}

export function WeatherWidget(props: WeatherWidgetProps) {
  const { location, asOf, unit = 'C', current, hourly, daily } = props

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className='relative rounded-xl p-4 sm:p-5 shadow-md
                 bg-sidebar/60 backdrop-blur-md text-card-foreground
                 w-full flex flex-col gap-4 overflow-hidden'
    >
      {/* Subtle dot texture overlay */}
      <div className='pointer-events-none absolute inset-0 opacity-10 [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:18px_18px]' />

      {/* Optional glass reflection highlight */}
      <div className='absolute inset-x-0 top-0 h-[20%] bg-gradient-to-b from-foreground/10 to-transparent rounded-t-xl pointer-events-none' />

      {/* Header Row: Current weather, location, time */}
      <div className='relative flex flex-wrap justify-between items-center gap-2 w-full'>
        <div className='flex items-center gap-3'>
          {iconFor(current.kind, 'w-7 h-7')}
          <div>
            <div className='text-2xl font-semibold leading-tight'>
              {prettyTemp(current.temp, unit)}
            </div>
            <div className='text-xs opacity-80 capitalize'>
              {current.description ?? current.kind}
            </div>
          </div>
        </div>

        <div className='text-xs text-right space-y-0.5'>
          <div className='flex items-center justify-end gap-1 opacity-80'>
            <MapPin className='w-3.5 h-3.5' />
            <span className='truncate max-w-[120px]'>{location}</span>
          </div>
          <div className='flex items-center justify-end gap-1 opacity-70'>
            <Clock className='w-3.5 h-3.5' />
            <span>{asOf}</span>
          </div>
        </div>
      </div>

      {/* Next 5 days */}
      <div className='relative flex gap-4 flex-wrap justify-center sm:justify-start'>
        {daily.map((d, i) => (
          <div
            key={i}
            className='flex flex-col items-center text-center text-xs'
          >
            <div className='opacity-80 mb-0.5'>{d.dow}</div>
            {iconFor(d.icon, 'w-4 h-4 mb-0.5')}
            <div className='font-medium'>{Math.round(d.high)}°</div>
            <div className='text-[10px] opacity-70'>{Math.round(d.low)}°</div>
          </div>
        ))}
      </div>

      {/* Temperature Chart */}
      <div className='relative w-full h-32 sm:h-40'>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart
            data={hourly}
            margin={{ left: 16, right: 16, top: 6, bottom: 0 }}
          >
            <XAxis
              dataKey='t'
              tickFormatter={(v) => formatTimeLabel(v)}
              tick={{ fill: 'currentColor', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={0}
              padding={{ left: 6, right: 6 }}
            />
            <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: 12,
                backgroundColor: 'var(--background)',
                boxShadow: 'var(--shadow-md)',
              }}
              labelFormatter={(l) => formatTimeLabel(l)}
              formatter={(v: number) => [prettyTemp(v as number, unit), '']}
              cursor={{
                stroke: 'currentColor',
                strokeOpacity: 0.4,
                strokeDasharray: '3 3',
              }}
            />
            <Line
              type='monotone'
              dataKey='temp'
              stroke='currentColor'
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}