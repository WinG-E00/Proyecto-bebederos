import { useWeather } from '../hooks/useWeather.js'
import AsyncState from './AsyncState.jsx'
import { formatDate } from '../lib/dates.js'
export default function WeatherCard({farm, compact = false}) {
 const query=useWeather(farm.id), data=query.data
 const Heading = compact ? 'h3' : 'h2'
 return <article className={compact ? 'space-y-2' : 'rounded-xl border p-4 space-y-2'} aria-label={`Clima de ${farm.name}`}>
  <Heading className="text-lg font-bold">{farm.name}</Heading>
  <AsyncState loading={query.isPending} error={query.error} onRetry={()=>query.refetch()}/>
  {data?.unavailable&&<p>Información climática no disponible.</p>}
  {data&&!data.unavailable&&<>
   {(data.stale||query.stale)&&<p role="status">Datos climáticos antiguos. No se pudo obtener información actual.</p>}
   <p className="text-2xl font-semibold">{data.temperatureC} °C · {data.condition}</p>
   {!compact && <p>Humedad: {data.humidityPercent}%</p>}
   <p>Probabilidad de lluvia: {data.rainProbabilityPercent}%</p>
   {!compact && <><p>Máxima del día {data.rainPeriod} · {data.timezone}</p>
   <p>Referencia: {formatDate(data.observedAt,data.timezone)}</p>
   <p>Consultado: {formatDate(data.fetchedAt,data.timezone)}</p>
   <p className="text-sm">{data.source} · {data.model}</p></>}
   {compact && <p className="text-sm">Actualizado: {formatDate(data.observedAt,data.timezone)}</p>}
  </>}
 </article>
}
