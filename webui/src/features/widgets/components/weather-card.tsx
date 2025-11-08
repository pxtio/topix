/**
 * components/weather-card.tsx
 *
 * A small wrapper component that fetches and displays
 * weather data for a given city using the `useFetchWeather` hook.
 *
 * Handles loading, error, and no-data states gracefully.
 */

import { useFetchWeather } from '../hooks/weather'
import { WeatherWidget } from '../components/weather-widget'

type WeatherCardProps = {
  city: string
}

export function WeatherCard({ city }: WeatherCardProps) {
  const { data, isPending, error } = useFetchWeather(city)

  if (isPending || error || !data)
    return null

  return (
    <div className='w-full flex items-center justify-center'>
      <WeatherWidget {...data} />
    </div>
  )
}