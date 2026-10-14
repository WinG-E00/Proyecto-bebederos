import { Link } from 'react-router-dom'
import WeatherCard from './WeatherCard.jsx'
export default function DashboardDetails({data,scope}) {
 const farms=scope.selected?[scope.selected]:(scope.farms.data?.items??[])
 const suffix=scope.farmId?`?farmId=${scope.farmId}`:''
 return <div className="dashboard-details space-y-5 mt-6">
  <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Totales del alcance">
   {[['Establecimientos',data.farms,'farms'],['Animales',data.animals,'animals'],['Agua Baja',data.water.low,'troughs'],['Agua Crítica',data.water.critical,'troughs'],['Sin medición de agua',data.water.missing,'troughs'],['Alertas activas',data.activeAlerts,'alerts']].map(([label,count,path])=><Link key={label} to={`/${path}${suffix}`} className="rounded-xl border p-4 min-h-11"><h2 className="font-semibold">{label}</h2><p className="text-2xl">{count}</p></Link>)}
  </section>
  <section className="rounded-xl border p-4 space-y-3"><h2 className="text-xl font-bold">Tareas abiertas: {data.tasks.total}</h2><div className="flex flex-wrap gap-4"><p>Pendientes: {data.tasks.pending}</p><p>En progreso: {data.tasks.inProgress}</p><p>Pendientes de validación: {data.tasks.validation}</p></div><Link className="inline-flex min-h-11 items-center underline" to={`/tasks${suffix}`}>Ver tareas y responsables</Link></section>
  <section><h2 className="text-xl font-bold mb-3">Clima de los establecimientos</h2>{!farms.length&&<p>No hay establecimientos disponibles.</p>}<div className="grid gap-3 md:grid-cols-2">{farms.map(f=><WeatherCard key={f.id} farm={f}/>)}</div></section>
 </div>
}
