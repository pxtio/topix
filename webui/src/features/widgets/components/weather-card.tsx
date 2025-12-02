/**
 * components/weather-card.tsx
 *
 * A small wrapper component that fetches and displays
 * weather data for multiple cities using the `useFetchWeather` hook.
 *
 * Includes a minimal city selector with animated underline tabs.
 */

import { useState, useCallback, useMemo } from 'react'
import { useFetchWeather } from '../hooks/weather'
import { WeatherWidget } from '../components/weather-widget'

type WeatherCardProps = {
  cities: string[]
}

export function WeatherCard({ cities }: WeatherCardProps) {
  const [activeIdx, setActiveIdx] = useState(0)

  const activeCity = useMemo(
    () => cities[activeIdx] ?? cities[0] ?? 'New York',
    [cities, activeIdx]
  )

  const { data, isPending, error } = useFetchWeather(activeCity)

  const handlePick = useCallback((idx: number) => {
    setActiveIdx(idx)
  }, [])

  if (isPending || error || !data) return null

  return (
    <div className='w-full space-y-2'>
      {/* City selector */}
      <div className='w-full flex flex-row items-center justify-center gap-4'>
        {cities.map((city, idx) => {
          const isActive = idx === activeIdx
          return (
            <button
              key={city}
              onClick={() => handlePick(idx)}
              className={[
                'relative pb-1 text-xs transition-colors duration-200',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              ].join(' ')}
            >
              {city}
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

      {/* Active weather widget */}
      <div className='w-full flex items-center justify-center'>
        <WeatherWidget {...data} />
      </div>
    </div>
  )
}