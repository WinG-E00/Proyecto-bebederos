import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ClipboardList, CloudSun, Droplets, Fence, MapPin } from 'lucide-react'
import WeatherCard from './WeatherCard.jsx'
import PanelSection from './PanelSection.jsx'
import MapaBebederos from '../pages/interfazPeon/MapaBebederos.jsx'

function PanelWeather({ farms }) {
 const [selectedId, setSelectedId] = useState('')
 const farm = farms.find(f => String(f.id) === selectedId) ?? farms[0]
 if (!farm) return <p>No hay establecimientos disponibles.</p>
 return <div className="space-y-3">
  {farms.length > 1 && <label className="grid gap-2">Establecimiento<select className="min-h-11 rounded-lg border px-3" value={String(farm.id)} onChange={e => setSelectedId(e.target.value)}>{farms.map(f => <option key={f.id} value={String(f.id)}>{f.name}</option>)}</select></label>}
  <WeatherCard key={farm.id} farm={farm} compact />
 </div>
}

export default function DashboardDetails({ data, scope, alerts = [], activity = [] }) {
 const farms = scope.selected ? [scope.selected] : (scope.farms.data?.items ?? [])
 const suffix = scope.farmId ? `?farmId=${scope.farmId}` : ''
 const hasIssues = data.activeAlerts > 0 || data.water.critical > 0 || data.water.low > 0 || data.water.missing > 0
 return <div className="dashboard-details mt-6 space-y-4">
  <section
    className={`rounded-2xl border p-5 space-y-3.5 shadow-xs transition ${
      hasIssues
        ? 'border-amber-300/80 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/60'
        : 'border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/50'
    }`}
    aria-label="Necesita atención"
  >
   <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
     <Bell className={hasIssues ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'} size={20} aria-hidden="true" />
     Necesita atención
   </h2>
   <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
    <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-black/5 dark:hover:bg-white/5 underline focus-visible:outline-3 focus-visible:outline-[#d3a865]" to={`/alerts${suffix}`}>
      Alertas activas: {data.activeAlerts}
    </Link>
    <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-black/5 dark:hover:bg-white/5 underline focus-visible:outline-3 focus-visible:outline-[#d3a865]" to={`/troughs${suffix}`}>
      <Droplets className="text-blue-600 dark:text-blue-400" size={18} aria-hidden="true" />
      Agua crítica: {data.water.critical} · Baja: {data.water.low} · Sin medición: {data.water.missing}
    </Link>
   </div>
   {alerts.length > 0 && (
     <ul className="space-y-2 border-t border-border/50 pt-2 text-sm">
       {alerts.slice(0, 3).map(a => (
         <li key={a.id}>
           <Link className="inline-flex min-h-11 items-center rounded-lg px-2 hover:bg-black/5 dark:hover:bg-white/5 underline focus-visible:outline-3 focus-visible:outline-[#d3a865]" to={`/alerts${suffix}`}>
             {a.message}
           </Link>
         </li>
       ))}
     </ul>
   )}
   {!hasIssues && <p className="text-sm text-muted-foreground">Sin alertas activas ni problemas de agua registrados.</p>}
  </section>
  <PanelSection title="Tareas y actividad" description={`${data.tasks.total} abiertas · ${data.tasks.pending} pendientes · ${data.tasks.validation} por validar`} icon={ClipboardList}>
   <p className="mb-3">En progreso: {data.tasks.inProgress}</p>
   {activity.length > 0 && <ul className="space-y-2 mb-3">{activity.slice(0, 5).map(t => <li key={t.id}>{t.title} · {t.workerName ?? 'Sin asignar'}</li>)}</ul>}
   <Link className="inline-flex min-h-11 items-center underline" to={`/tasks${suffix}`}>Ver tareas y responsables</Link>
  </PanelSection>
  <PanelSection title="Recursos del campo" description={`${data.troughs} bebederos · ${data.animals} animales · ${data.farms} ${data.farms === 1 ? 'establecimiento' : 'establecimientos'}`} icon={Fence}>
   <ul className="grid gap-2 sm:grid-cols-2">
    {[[Droplets, 'Bebederos', data.troughs, 'troughs'], [Fence, 'Animales', data.animals, 'animals'], [MapPin, 'Establecimientos', data.farms, 'farms']].map(([Icon, label, count, path]) => <li key={path}><Link className="inline-flex min-h-11 items-center gap-2 underline" to={`/${path}${suffix}`}><Icon size={18} aria-hidden="true" />{label}: {count}</Link></li>)}
   </ul>
  </PanelSection>
  <PanelSection title="Clima" description={`${farms.length} ${farms.length === 1 ? 'establecimiento' : 'establecimientos'} · Consultar condiciones y lluvia`} icon={CloudSun}>
   <PanelWeather farms={farms} />
   <Link className="inline-flex min-h-11 items-center underline" to={`/weather${suffix}`}>Ver clima de los establecimientos</Link>
  </PanelSection>
  <PanelSection title="Ubicaciones" description="Consultar mapa o buscar animales y bebederos" icon={MapPin}>
   <MapaBebederos farmId={scope.farmId} center={scope.selected} compact />
  </PanelSection>
 </div>
}
