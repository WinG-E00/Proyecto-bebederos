import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, BellRing, Building2, CalendarClock, CalendarDays, ChevronDown, ChevronRight, CircleCheckBig,
  Clock, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, ClipboardCheck,
  ClipboardList, Droplet, Droplets, Fence, Gauge, Hourglass, MapPin, MapPinOff, Moon, Sun, UserRound,
  Users, Wind, WifiOff, Wrench,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import { useWeather } from '../hooks/useWeather.js'
import { formatDate } from '../lib/dates.js'
import AsyncState from './AsyncState.jsx'
import { ResourceMap } from './ManagementUI.jsx'
import CowIcon from './icons/CowIcon.jsx'
import './OwnerDashboard.css'

// Ícono de cada tipo de alerta (ver database/services/alerts.service.js).
const alertIcons = {
  water_critical: [Droplet, 'urgent'], water_low: [Gauge, 'warning'], water_missing: [WifiOff, 'warning'],
  water_stale: [Clock, 'review'], gps_missing: [MapPinOff, 'warning'], gps_stale: [MapPin, 'review'],
}

function WeatherIcon({ condition = '', ...props }) {
  const c = condition.toLocaleLowerCase('es-AR')
  if (/torment|eléctric/.test(c)) return <CloudLightning {...props} />
  if (/nieve|nevad|granizo/.test(c)) return <CloudSnow {...props} />
  if (/llovizna/.test(c)) return <CloudDrizzle {...props} />
  if (/lluvi|chaparr|precip/.test(c)) return <CloudRain {...props} />
  if (/niebla|neblina|bruma/.test(c)) return <CloudFog {...props} />
  if (/viento|ventoso/.test(c)) return <Wind {...props} />
  if (/parcial|algo nublado|intervalos/.test(c)) return <CloudSun {...props} />
  if (/nublado|cubierto|nubes/.test(c)) return <Cloud {...props} />
  if (/despejado|soleado|sol/.test(c)) return <Sun {...props} />
  return <CloudSun {...props} />
}

function taskIcon(t) {
  const text = `${t.title ?? ''} ${t.description ?? ''}`.toLocaleLowerCase('es-AR')
  if (t.troughName || /agua|bebedero|flotante|caño|tanque|represa/.test(text)) return [Droplets, 'water']
  if (/animal|vaca|ganado|rodeo|ternero|hacienda|vacun/.test(text)) return [CowIcon, 'cattle']
  if (/alambr|cerco|tranquera|potrero|poste/.test(text)) return [Fence, 'field']
  if (/repar|arregl|mantenim|bomba|molino|limpi/.test(text)) return [Wrench, 'repair']
  return [ClipboardList, 'general']
}
const stateTone = { 'Pendiente': 'pending', 'En progreso': 'progress', 'Pendiente de validación': 'review', 'Completada': 'done' }

function DashboardWeather({ farms, suffix }) {
  const [selectedId, setSelectedId] = useState('')
  const farm = farms.find(f => String(f.id) === selectedId) ?? farms[0]
  const query = useWeather(farm?.id)
  const data = query.data
  return <section className="panel od-weather">
    <header className="od-panel-head">
      <span className="od-head-icon od-head-icon--sky"><CloudSun size={20} aria-hidden="true" /></span>
      <div className="od-head-copy"><h2>Clima</h2><p>{farm?.name || 'Sin establecimientos'}</p></div>
      <Link className="icon-button" aria-label="Ver clima de los establecimientos" to={`/weather${suffix}`}><ChevronRight size={20} aria-hidden="true" /></Link>
    </header>
    {farms.length > 1 && <label className="weather-selector">Establecimiento del clima<select value={String(farm.id)} onChange={e => setSelectedId(e.target.value)}>{farms.map(f => <option key={f.id} value={String(f.id)}>{f.name}</option>)}</select></label>}
    {!farm ? <p className="panel-message">No hay establecimientos disponibles.</p> : <>
      <div className="panel-message"><AsyncState loading={query.isPending} error={query.error} onRetry={() => query.refetch()} /></div>
      {data?.unavailable && <p className="panel-message">Información climática no disponible.</p>}
      {data && !data.unavailable && <>
        {(data.stale || query.stale) && <p role="status" className="panel-message">Datos climáticos antiguos. No se pudo obtener información actual.</p>}
        <div className="od-weather-hero">
          <span className="od-weather-icon"><WeatherIcon condition={data.condition} size={44} strokeWidth={1.75} aria-hidden="true" /></span>
          <div><strong>{data.temperatureC}°</strong><p>{data.condition}</p></div>
        </div>
        <div className="od-weather-stats">
          <div><Droplets size={18} aria-hidden="true" /><span><small>Humedad</small><strong>{data.humidityPercent}%</strong></span></div>
          <div><CloudRain size={18} aria-hidden="true" /><span><small>Prob. de lluvia</small><strong>{data.rainProbabilityPercent}%</strong></span></div>
        </div>
        <p className="od-updated"><Clock size={13} aria-hidden="true" />Actualizado: {formatDate(data.observedAt, data.timezone)}</p>
      </>}
    </>}
  </section>
}

export default function OwnerDashboard({ data, scope, alerts = [], activity = [], status }) {
  const { account } = useAuth()
  const [tab, setTab] = useState('open')
  const [alertsOpen, setAlertsOpen] = useState(true)
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('modo') === 'dark' } catch { return false }
  })
  const suffix = scope.farmId ? `?farmId=${scope.farmId}` : ''
  const farms = scope.selected ? [scope.selected] : (scope.farms.data?.items ?? [])
  const tasks = activity.filter(t => tab === 'validation' ? t.state === 'Pendiente de validación' : t.state !== 'Completada').slice(0, 5)
  const waterIssues = data.water.critical + data.water.low + data.water.missing
  const calm = !data.activeAlerts && !waterIssues
  function toggleTheme() {
    const next = !dark
    setDark(next)
    try { localStorage.setItem('modo', next ? 'dark' : 'light') } catch { /* Tema disponible sin almacenamiento. */ }
  }
  const metrics = [
    { to: '/troughs', Icon: Droplets, tone: 'water', label: 'Bebederos', value: data.troughs, detail: 'Puntos de agua registrados' },
    { to: '/animals', Icon: CowIcon, tone: 'cattle', label: 'Animales', value: data.animals, detail: 'Identificación y ubicación' },
    { to: '/tasks', Icon: ClipboardCheck, tone: 'tasks', label: 'Tareas abiertas', value: data.tasks.total, detail: `${data.tasks.validation} por validar` },
    { to: '/alerts', Icon: Bell, tone: 'alerts', label: 'Alertas activas', value: data.activeAlerts, detail: data.activeAlerts ? 'Requieren revisión' : 'Todo en orden' },
  ]
  return <main className={`management-ui management-content od${dark ? ' management-ui--dark' : ''}`}>
    <header className="page-heading"><div><p className="eyebrow">Resumen operativo</p><h1>Panel del campo</h1><p>Hola, {account.name.split(' ')[0]}. Este es el estado de <strong>{scope.selected?.name || 'tus establecimientos'}</strong>.</p></div><div className="dashboard-heading-actions"><span className="heading-date"><CalendarDays size={17} aria-hidden="true" />{new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: scope.selected?.timezone || 'America/Argentina/Buenos_Aires' }).format(new Date())}</span><button className="icon-button" type="button" onClick={toggleTheme} aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'} aria-pressed={dark}>{dark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}</button></div></header>
    {status}

    <section className={`od-alerts${calm ? ' od-alerts--calm' : ''}`} aria-label="Necesita atención">
      <h2 className="od-alerts-heading">
        <button type="button" className="od-alerts-toggle" aria-expanded={alertsOpen} aria-controls="od-alerts-body" onClick={() => setAlertsOpen(!alertsOpen)}>
          <span className="od-bell">
            {calm ? <CircleCheckBig size={22} aria-hidden="true" /> : <BellRing size={22} aria-hidden="true" />}
            {!calm && data.activeAlerts > 0 && <span className="od-bell-badge" aria-hidden="true">{data.activeAlerts > 99 ? '99+' : data.activeAlerts}</span>}
          </span>
          <span className="od-head-copy">
            <span className="od-alerts-title">Necesita atención</span>
            <small>{calm ? 'Sin alertas activas ni problemas de agua.' : data.activeAlerts === 1 ? '1 alerta activa que requiere revisión.' : `${data.activeAlerts} alertas activas que requieren revisión.`}</small>
          </span>
          <ChevronDown className="od-chevron" size={20} aria-hidden="true" />
        </button>
      </h2>
      <div id="od-alerts-body" className="od-alerts-body" hidden={!alertsOpen}>
        <Link className="od-water" to={`/troughs${suffix}`}>
          <span className="od-row-icon od-row-icon--water"><Droplets size={18} aria-hidden="true" /></span>
          <span className="od-water-copy"><strong>Estado del agua</strong>
            <span className="od-water-chips">
              <span className={`od-chip ${data.water.critical ? 'od-chip--urgent' : ''}`}>Agua crítica: {data.water.critical}</span>
              <span className={`od-chip ${data.water.low ? 'od-chip--warning' : ''}`}>Baja: {data.water.low}</span>
              <span className={`od-chip ${data.water.missing ? 'od-chip--review' : ''}`}>Sin medición: {data.water.missing}</span>
            </span>
          </span>
          <ChevronRight size={17} aria-hidden="true" />
        </Link>
        {alerts.length > 0 && <ul className="od-alert-list">
          {alerts.slice(0, 3).map(a => {
            const [Icon, tone] = alertIcons[a.conditionName] ?? [Bell, 'warning']
            return <li key={a.id}><Link className="od-alert-row" to={`/alerts${suffix}`}>
              <span className={`od-row-icon od-row-icon--${tone}`}><Icon size={17} aria-hidden="true" /></span>
              <span className="od-alert-copy"><strong>{a.message}</strong>{a.generatedAt && <small>{formatDate(a.generatedAt)}</small>}</span>
              <ChevronRight size={17} aria-hidden="true" />
            </Link></li>
          })}
        </ul>}
        {calm && <p className="all-clear">Sin alertas activas ni problemas de agua registrados.</p>}
        <Link className="od-alerts-more" to={`/alerts${suffix}`}><Bell size={16} aria-hidden="true" />Ver todas las alertas<ChevronRight size={16} aria-hidden="true" /></Link>
      </div>
    </section>

    <section className="od-metrics" aria-label="Recursos del campo">
      {metrics.map(m => <Link key={m.to} className={`od-metric od-metric--${m.tone}`} to={`${m.to}${suffix}`}>
        <span className="od-metric-icon"><m.Icon size={22} aria-hidden="true" /></span>
        <span className="od-metric-copy"><small>{m.label}</small><strong>{m.value ?? '—'}</strong><em>{m.detail}</em></span>
        <ChevronRight className="od-metric-arrow" size={17} aria-hidden="true" />
      </Link>)}
    </section>

    <div className="dashboard-grid">
      <section className="panel od-tasks">
        <header className="od-panel-head">
          <span className="od-head-icon"><ClipboardCheck size={20} aria-hidden="true" /></span>
          <div className="od-head-copy"><h2>Tareas y actividad</h2><p>{data.tasks.pending} pendientes · {data.tasks.inProgress} en progreso</p></div>
          <Link className="text-button" to={`/tasks${suffix}`}>Ver tareas<ChevronRight size={16} aria-hidden="true" /></Link>
        </header>
        <div className="od-tabs" role="group" aria-label="Filtrar actividad">
          <button type="button" aria-pressed={tab === 'open'} onClick={() => setTab('open')}><ClipboardList size={16} aria-hidden="true" />Abiertas<span>{data.tasks.total}</span></button>
          <button type="button" aria-pressed={tab === 'validation'} onClick={() => setTab('validation')}><Hourglass size={16} aria-hidden="true" />Por validar<span>{data.tasks.validation}</span></button>
        </div>
        <ul className="od-task-list">{tasks.map(t => {
          const [Icon, kind] = taskIcon(t)
          return <li key={t.id}><Link className="od-task" to={`/tasks?${scope.farmId ? `farmId=${scope.farmId}&` : ''}id=${t.id}`}>
            <span className={`od-task-icon od-task-icon--${kind}`}><Icon size={18} aria-hidden="true" /></span>
            <span className="od-task-copy"><strong>{t.title}</strong>
              <small><span><UserRound size={13} aria-hidden="true" />{t.workerName ?? 'Sin asignar'}</span>{t.deadline && <span><CalendarClock size={13} aria-hidden="true" />{formatDate(t.deadline)}</span>}</small>
            </span>
            <span className={`od-state od-state--${stateTone[t.state] ?? 'pending'}`}>{t.state}</span>
            <ChevronRight className="od-task-arrow" size={17} aria-hidden="true" />
          </Link></li>
        })}</ul>
        {!tasks.length && <p className="od-empty"><CircleCheckBig size={18} aria-hidden="true" />{tab === 'validation' ? 'No hay tareas por validar en la actividad cargada.' : 'No hay actividad reciente.'}</p>}
        <footer className="od-tasks-footer"><Link className="text-button" to={`/tasks${suffix}`}>Ver tareas y responsables<ChevronRight size={16} aria-hidden="true" /></Link></footer>
      </section>
      <DashboardWeather farms={farms} suffix={suffix} />
      <div className="locations-panel"><ResourceMap key={scope.farmId} scope={scope} farmPicker title="Ubicaciones" description="Límites, animales y bebederos de cada campo" /></div>
    </div>
    <footer className="resources-footer"><Building2 size={18} aria-hidden="true" /><Link to={`/farms${suffix}`}>{data.farms} {data.farms === 1 ? 'establecimiento vinculado' : 'establecimientos vinculados'} · Administrar campos</Link><span><Users size={15} aria-hidden="true" /> {data.workers} integrantes del equipo</span></footer>
  </main>
}
