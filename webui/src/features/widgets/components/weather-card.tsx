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

  if (isPending)
    return (
      <div className='flex flex-col items-center justify-center py-10'>
        <p className='text-muted-foreground animate-pulse'>
          Loading weather for {city}...
        </p>
      </div>
    )

  if (error)
    return (
      <div className='flex flex-col items-center justify-center py-10'>
        <p className='text-destructive'>Error loading weather for {city}</p>
      </div>
    )

  if (!data)
    return (
      <div className='flex flex-col items-center justify-center py-10'>
        <p className='text-muted-foreground'>No weather data available</p>
      </div>
    )

  return (
    <div className='w-full flex items-center justify-center'>
      <WeatherWidget {...data} />
    </div>
  )
}