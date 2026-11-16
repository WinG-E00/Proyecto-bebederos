import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  Wind
} from 'lucide-react'
import { useWeather } from '../hooks/useWeather.js'
import AsyncState from './AsyncState.jsx'
import { formatDate } from '../lib/dates.js'

function WeatherIcon({ weatherCode, compact }) {
  const props = {
    className: 'mt-0.5 shrink-0 text-sky-600 dark:text-sky-400',
    size: compact ? 24 : 30,
    strokeWidth: 1.8,
    'aria-hidden': true
  }

  if (weatherCode === 0) return <Sun {...props} />
  if ([1, 2].includes(weatherCode)) return <CloudSun {...props} />
  if ([45, 48].includes(weatherCode)) return <CloudFog {...props} />
  if ([51, 53, 55, 56, 57].includes(weatherCode)) return <CloudDrizzle {...props} />
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return <CloudRain {...props} />
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return <CloudSnow {...props} />
  if ([95, 96, 99].includes(weatherCode)) return <CloudLightning {...props} />
  return <Cloud {...props} />
}

function WeatherSkeleton({ compact }) {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Cargando el clima del establecimiento…</span>
      <div className="flex items-center gap-4">
        <div className={`animate-pulse rounded-lg bg-muted ${compact ? 'h-10 w-28' : 'h-14 w-36'}`} />
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-3 gap-3 border-t border-border/70 pt-4">
        {[0, 1, 2].map(item => (
          <div className="space-y-2" key={item}>
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-5 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

function WeatherMetric({ icon: Icon, label, value, unit }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon size={15} aria-hidden="true" />
        <span>{label}</span>
      </dt>
      <dd className="mt-1 text-sm font-semibold tabular-nums text-card-foreground">
        {value ?? '—'} <span className="font-normal text-muted-foreground">{unit}</span>
      </dd>
    </div>
  )
}

export default function WeatherCard({ farm, compact = false }) {
  const query = useWeather(farm)
  const data = query.data

  return (
    <article
      className={compact
        ? 'space-y-4'
        : 'space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm'}
      aria-label={`Clima de ${farm.name}`}
    >
      <header className="flex items-start justify-between gap-4">
        <h2 className="min-w-0 text-lg font-bold leading-snug text-card-foreground">
          {farm.name}
        </h2>
        {data && !data.unavailable && (
          <WeatherIcon weatherCode={data.weatherCode} compact={compact} />
        )}
      </header>

      {query.isPending ? (
        <WeatherSkeleton compact={compact} />
      ) : (
        <AsyncState
          error={data ? null : query.error}
          onRetry={() => query.refetch()}
        >
          {data?.unavailable ? (
            <p role="status" className="text-sm text-muted-foreground">
              Información climática no disponible.
            </p>
          ) : data ? (
            <div className="space-y-5">
              {query.error && (
                <p role="status" className="text-sm text-amber-800 dark:text-amber-300">
                  No se pudo actualizar el clima. Se muestran los últimos datos recibidos.
                </p>
              )}
              {data.stale && (
                <p role="status" className="text-sm text-amber-800 dark:text-amber-300">
                  Datos climáticos antiguos. No se pudo obtener información actual.
                </p>
              )}

              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-4xl font-bold leading-none tracking-tight tabular-nums text-card-foreground">
                  {data.temperatureC ?? '—'} °C
                </span>
                <span className="text-base font-medium text-muted-foreground">
                  · {data.condition}
                </span>
              </p>

              <dl className="grid grid-cols-3 gap-3 border-t border-border/70 pt-4">
                <WeatherMetric
                  icon={Droplets}
                  label="Humedad"
                  value={data.humidityPercent}
                  unit="%"
                />
                <WeatherMetric
                  icon={Wind}
                  label="Viento"
                  value={data.windSpeedKmh}
                  unit="km/h"
                />
                <WeatherMetric
                  icon={CloudRain}
                  label="Lluvia"
                  value={data.rainProbabilityPercent}
                  unit="%"
                />
              </dl>

              <p className="text-xs text-muted-foreground">
                Actualizado: {formatDate(data.observedAt, data.timezone)}
                {!compact && data.source && <> · Fuente: {data.source}</>}
              </p>
            </div>
          ) : null}
        </AsyncState>
      )}
    </article>
  )
}
