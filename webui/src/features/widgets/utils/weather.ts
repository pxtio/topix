/**
 * utils/weather.ts
 *
 * Utility functions to fetch and normalize weather data from Open-Meteo.
 * Uses the Open-Meteo Geocoding API + Forecast API (no API key required).
 *
 * Returns data formatted for the WeatherWidget component.
 */

import type { WeatherWidgetProps } from '../components/weather-widget'

/**
 * Fetch current and forecast weather data for a given city name
 * @param city - City name, e.g. 'Paris' or 'New York'
 * @returns WeatherWidgetProps object or null if not found / API error
 */
export async function fetchWeatherByCity(city: string): Promise<WeatherWidgetProps | null> {
  try {
    // 1️⃣ Geocode city name → coordinates
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    )
    if (!geoRes.ok) throw new Error('Geocoding API request failed')

    const geoData = await geoRes.json()
    const location = geoData.results?.[0]
    if (!location) throw new Error(`City not found: ${city}`)

    const { latitude, longitude, name, country } = location

    // 2️⃣ Fetch weather forecast
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`
    )
    if (!weatherRes.ok) throw new Error('Weather API request failed')

    const weatherData = await weatherRes.json()

    // 3️⃣ Normalize hourly and daily data
    const hourly = (weatherData.hourly?.time || [])
      .slice(0, 6)
      .map((t: string, i: number) => ({
        t: new Date(t).toLocaleTimeString([], { hour: 'numeric' }),
        temp: weatherData.hourly.temperature_2m[i],
      }))

    const daily = (weatherData.daily?.time || [])
      .slice(0, 5)
      .map((t: string, i: number) => ({
        dow: new Date(t).toLocaleDateString([], { weekday: 'short' }),
        high: weatherData.daily.temperature_2m_max[i],
        low: weatherData.daily.temperature_2m_min[i],
        icon: mapWeatherCode(weatherData.daily.weathercode[i]),
      }))

    // 4️⃣ Return widget data
    return {
      location: `${name}, ${country}`,
      asOf: new Date().toLocaleString(),
      unit: 'C',
      current: {
        temp: weatherData.current_weather?.temperature ?? 0,
        kind: mapWeatherCode(weatherData.current_weather?.weathercode),
        description: describeWeather(weatherData.current_weather?.weathercode),
      },
      hourly,
      daily,
    }
  } catch (err) {
    console.error('Failed to fetch weather:', err)
    return null
  }
}

/**
 * Map Open-Meteo weather codes to widget icon kinds
 */
function mapWeatherCode(code?: number): WeatherWidgetProps['current']['kind'] {
  if (code == null) return 'sunny'
  if ([0].includes(code)) return 'sunny'
  if ([1, 2].includes(code)) return 'partly'
  if ([3].includes(code)) return 'cloudy'
  if ([45, 48].includes(code)) return 'cloudy'
  if ([51, 53, 55, 56, 57].includes(code)) return 'drizzle'
  if ([61, 63, 65, 80, 81, 82].includes(code)) return 'rain'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'snow'
  return 'cloudy'
}

/**
 * Convert weather codes to human-readable descriptions
 */
function describeWeather(code?: number): string {
  const map: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    61: 'Light rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Rain showers',
    95: 'Thunderstorm',
  }
  return map[code ?? 0] ?? 'Unknown'
}
