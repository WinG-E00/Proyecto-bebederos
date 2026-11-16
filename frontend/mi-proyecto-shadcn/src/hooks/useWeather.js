import { useQuery } from '@tanstack/react-query'

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'
const DEFAULT_LAT = -26.18
const DEFAULT_LON = -58.17
const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires'

const conditionByCode = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna intensa',
  56: 'Llovizna helada ligera',
  57: 'Llovizna helada intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  66: 'Lluvia helada ligera',
  67: 'Lluvia helada intensa',
  71: 'Nieve ligera',
  73: 'Nieve moderada',
  75: 'Nieve intensa',
  77: 'Granos de nieve',
  80: 'Chubascos ligeros',
  81: 'Chubascos moderados',
  82: 'Chubascos intensos',
  85: 'Chubascos de nieve ligeros',
  86: 'Chubascos de nieve intensos',
  95: 'Tormenta',
  96: 'Tormenta con granizo ligero',
  99: 'Tormenta con granizo intenso'
}

const getIconForCode = (code) => {
  const icons = {
    0: 'Sun',
    1: 'CloudSun',
    2: 'CloudSun',
    3: 'Cloud',
    45: 'CloudFog',
    48: 'CloudFog',
    51: 'CloudDrizzle',
    53: 'CloudDrizzle',
    55: 'CloudDrizzle',
    56: 'CloudDrizzle',
    57: 'CloudDrizzle',
    61: 'CloudRain',
    63: 'CloudRain',
    65: 'CloudRain',
    66: 'CloudRain',
    67: 'CloudRain',
    71: 'CloudSnow',
    73: 'CloudSnow',
    75: 'CloudSnow',
    77: 'CloudSnow',
    80: 'CloudRain',
    81: 'CloudRain',
    82: 'CloudRain',
    85: 'CloudSnow',
    86: 'CloudSnow',
    95: 'CloudLightning',
    96: 'CloudLightning',
    99: 'CloudLightning'
  }
  return icons[code] || 'Cloud'
}

export function useWeather(farm) {
  const lat = farm?.latitude ?? DEFAULT_LAT
  const lon = farm?.longitude ?? DEFAULT_LON
  const timezone = farm?.timezone ?? DEFAULT_TIMEZONE

  return useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: async () => {
      const res = await fetch(
        `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
        `&daily=precipitation_probability_max` +
        `&timezone=${encodeURIComponent(timezone)}` +
        `&forecast_days=1`
      )
      if (!res.ok) throw new Error('WEATHER_PROVIDER_FAILED')
      const json = await res.json()
      const c = json.current
      const d = json.daily

      return {
        temperatureC: c.temperature_2m,
        humidityPercent: c.relative_humidity_2m,
        windSpeedKmh: c.wind_speed_10m,
        condition: conditionByCode[c.weather_code] ?? 'Desconocido',
        weatherCode: c.weather_code,
        rainProbabilityPercent: d.precipitation_probability_max?.[0] ?? 0,
        observedAt: c.time,
        timezone: json.timezone,
        source: 'Open-Meteo',
        model: 'best_match',
        unavailable: false,
        stale: false
      }
    },
    refetchInterval: 15 * 60 * 1000,
    staleTime: 15 * 60 * 1000
  })
}
