import { useWeather } from '../hooks/useWeather.js'
import AsyncState from './AsyncState.jsx'
import { formatDate } from '../lib/dates.js'
export default function WeatherCard({farm}) {
 const query=useWeather(farm.id), data=query.data
 return <article className="rounded-xl border p-4 space-y-2" aria-label={`Clima de ${farm.name}`}>
  <h2 className="text-lg font-bold">{farm.name}</h2>
  <AsyncState loading={query.isPending} error={query.error} onRetry={()=>query.refetch()}/>
  {data?.unavailable&&<p>Información climática no disponible.</p>}
  {data&&!data.unavailable&&<>
   {(data.stale||query.stale)&&<p role="status">Datos climáticos antiguos. No se pudo obtener información actual.</p>}
   <p className="text-2xl font-semibold">{data.temperatureC} °C · {data.condition}</p>
   <p>Humedad: {data.humidityPercent}%</p>
   <p>Probabilidad de lluvia: {data.rainProbabilityPercent}%</p>
   <p>Máxima del día {data.rainPeriod} · {data.timezone}</p>
   <p>Referencia: {formatDate(data.observedAt,data.timezone)}</p>
   <p>Consultado: {formatDate(data.fetchedAt,data.timezone)}</p>
   <p className="text-sm">{data.source} · {data.model}</p>
  </>}
 </article>
}
