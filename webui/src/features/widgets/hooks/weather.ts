/**
 * hooks/weather.ts
 *
 * A custom React hook for fetching weather data by city name,
 * built on top of TanStack Query (React Query v5).
 *
 * Provides caching, background refresh, and built-in loading/error states.
 */

import { useQuery, queryOptions } from '@tanstack/react-query'
import { fetchWeatherByCity } from '../utils/weather'

/**
 * React Query options factory for weather data
 * @param city City name, e.g. 'Paris'
 */
export const weatherQuery = (city: string) =>
  queryOptions({
    queryKey: ['weather', city.toLowerCase()],
    queryFn: () => fetchWeatherByCity(city),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  })

/**
 * Hook to fetch weather data for a given city
 *
 * Example:
 * ```tsx
 * const { data, isPending, error } = useFetchWeather('Berlin')
 * if (isPending) return <Spinner />
 * if (error) return <ErrorMessage />
 * return data ? <WeatherWidget {...data} /> : null
 * ```
 */
export function useFetchWeather(city: string) {
  return useQuery(weatherQuery(city))
}
