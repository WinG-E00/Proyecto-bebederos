import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Beef, Bell, Building2, CalendarDays, Check, ChevronRight, CloudSun, Droplets, Moon, Sun, Wrench } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import { useWeather } from '../hooks/useWeather.js'
import { formatDate } from '../lib/dates.js'
import AsyncState from './AsyncState.jsx'
import { MetricCard, ResourceMap } from './ManagementUI.jsx'

function DashboardWeather({ farms, suffix }) {
  const [selectedId, setSelectedId] = useState('')
  const farm = farms.find(f => String(f.id) === selectedId) ?? farms[0]
  const query = useWeather(farm?.id)
  const data = query.data
  return <section className="panel weather-panel">
    <header className="panel-title"><div><h2>Clima</h2><p>{farm?.name || 'Sin establecimientos'}</p></div><Link className="icon-button" aria-label="Ver clima de los establecimientos" to={`/weather${suffix}`}><CloudSun size={20} aria-hidden="true" /></Link></header>
    {farms.length > 1 && <label className="weather-selector">Establecimiento del clima<select value={String(farm.id)} onChange={e => setSelectedId(e.target.value)}>{farms.map(f => <option key={f.id} value={String(f.id)}>{f.name}</option>)}</select></label>}
    {!farm ? <p className="panel-message">No hay establecimientos disponibles.</p> : <>
      <div className="panel-message"><AsyncState loading={query.isPending} error={query.error} onRetry={() => query.refetch()} /></div>
      {data?.unavailable && <p className="panel-message">Información climática no disponible.</p>}
      {data && !data.unavailable && <>
        {(data.stale || query.stale) && <p role="status" className="panel-message">Datos climáticos antiguos. No se pudo obtener información actual.</p>}
        <div className="weather-main"><span className="sun"><CloudSun size={36} aria-hidden="true" /></span><div><strong>{data.temperatureC}°</strong><p>{data.condition}</p></div></div>
        <div className="weather-stats"><div><small>Humedad</small><strong>{data.humidityPercent}%</strong></div><div><small>Prob. de lluvia</small><strong>{data.rainProbabilityPercent}%</strong></div></div>
        <p className="updated">Actualizado: {formatDate(data.observedAt, data.timezone)}</p>
      </>}
    </>}
  </section>
}

export default function OwnerDashboard({ data, scope, alerts = [], activity = [], status }) {
  const { account } = useAuth()
  const [tab, setTab] = useState('open')
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('modo') === 'dark' } catch { return false }
  })
  const suffix = scope.farmId ? `?farmId=${scope.farmId}` : ''
  const farms = scope.selected ? [scope.selected] : (scope.farms.data?.items ?? [])
  const tasks = activity.filter(t => tab === 'validation' ? t.state === 'Pendiente de validación' : t.state !== 'Completada').slice(0, 5)
  function toggleTheme() {
    const next = !dark
    setDark(next)
    try { localStorage.setItem('modo', next ? 'dark' : 'light') } catch { /* Tema disponible sin almacenamiento. */ }
  }
  return <main className={`management-ui management-content${dark ? ' management-ui--dark' : ''}`}>
    <header className="page-heading"><div><p className="eyebrow">Resumen operativo</p><h1>Panel del campo</h1><p>Hola, {account.name.split(' ')[0]}. Este es el estado de <strong>{scope.selected?.name || 'tus establecimientos'}</strong>.</p></div><div className="dashboard-heading-actions"><span className="heading-date"><CalendarDays size={17} aria-hidden="true" />{new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: scope.selected?.timezone || 'America/Argentina/Buenos_Aires' }).format(new Date())}</span><button className="icon-button" type="button" onClick={toggleTheme} aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'} aria-pressed={dark}>{dark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}</button></div></header>
    {status}
    <section className={`attention${!data.activeAlerts ? ' attention--calm' : ''}`} aria-label="Necesita atención">
      <div className="attention-copy"><span className="alert-icon"><AlertTriangle size={21} aria-hidden="true" /></span><div><h2>Necesita atención</h2><p>{data.activeAlerts === 1 ? '1 alerta activa que requiere revisión.' : `${data.activeAlerts} alertas activas que requieren revisión.`}</p></div></div><Link className="text-button" to={`/alerts${suffix}`}>Ver todas las alertas<ChevronRight size={16} aria-hidden="true" /></Link>
      <div className="alert-list">
        <Link className="alert-row water-alert-row" to={`/troughs${suffix}`}><span className="status-dot" /><div><strong>Estado del agua</strong><p>Agua crítica: {data.water.critical} · Baja: {data.water.low} · Sin medición: {data.water.missing}</p></div><ChevronRight size={17} aria-hidden="true" /></Link>
        {alerts.slice(0, 3).map(a => <Link className="alert-row" to={`/alerts${suffix}`} key={a.id}><span className="status-dot" /><div><strong>{a.message}</strong></div><ChevronRight size={17} aria-hidden="true" /></Link>)}
        {!data.activeAlerts && !data.water.critical && !data.water.low && !data.water.missing && <p className="all-clear">Sin alertas activas ni problemas de agua registrados.</p>}
      </div>
    </section>
    <section className="metrics-grid" aria-label="Recursos del campo">
      <MetricCard icon={Droplets} label="Bebederos" value={data.troughs} detail="Puntos de agua registrados" to={`/troughs${suffix}`} />
      <MetricCard icon={Beef} label="Animales" value={data.animals} detail="Identificación y ubicación" tone="ochre" to={`/animals${suffix}`} />
      <MetricCard icon={Check} label="Tareas abiertas" value={data.tasks.total} detail={`${data.tasks.validation} por validar`} tone="blue" to={`/tasks${suffix}`} />
      <MetricCard icon={Bell} label="Alertas activas" value={data.activeAlerts} detail="Consultar situaciones pendientes" tone="red" to={`/alerts${suffix}`} />
    </section>
    <div className="dashboard-grid">
      <section className="panel tasks-panel"><header className="panel-title"><div><h2>Tareas y actividad</h2><p>{data.tasks.pending} pendientes · {data.tasks.inProgress} en progreso</p></div><Link className="text-button" to={`/tasks${suffix}`}>Ver tareas<ChevronRight size={16} aria-hidden="true" /></Link></header>
        <div className="task-tabs" role="group" aria-label="Filtrar actividad"><button type="button" className={tab === 'open' ? 'active' : ''} aria-pressed={tab === 'open'} onClick={() => setTab('open')}>Abiertas<span>{data.tasks.total}</span></button><button type="button" className={tab === 'validation' ? 'active' : ''} aria-pressed={tab === 'validation'} onClick={() => setTab('validation')}>Por validar<span>{data.tasks.validation}</span></button></div>
        <div className="task-list">{tasks.map(t => <Link className="task-row" to={`/tasks?${scope.farmId ? `farmId=${scope.farmId}&` : ''}id=${t.id}`} key={t.id}><span className={`task-check ${t.state === 'En progreso' ? 'blue' : 'amber'}`}><Wrench size={16} aria-hidden="true" /></span><span className="task-info"><strong>{t.title}</strong><small>{t.workerName ?? 'Sin asignar'}</small></span><span className="task-meta"><span className={`badge ${t.state === 'En progreso' ? 'blue' : 'amber'}`}>{t.state}</span>{t.deadline && <small>{formatDate(t.deadline)}</small>}</span><ChevronRight size={17} aria-hidden="true" /></Link>)}</div>
        {!tasks.length && <p className="panel-message">{tab === 'validation' ? 'No hay tareas por validar en la actividad cargada.' : 'No hay actividad reciente.'}</p>}
        <footer className="tasks-footer"><Link className="text-button" to={`/tasks${suffix}`}>Ver tareas y responsables<ChevronRight size={16} aria-hidden="true" /></Link></footer>
      </section>
      <DashboardWeather farms={farms} suffix={suffix} />
      <div className="locations-panel"><ResourceMap scope={scope} title="Ubicaciones" description="Animales y bebederos del campo" /></div>
    </div>
    <footer className="resources-footer"><Building2 size={18} aria-hidden="true" /><Link to={`/farms${suffix}`}>{data.farms} {data.farms === 1 ? 'establecimiento vinculado' : 'establecimientos vinculados'} · Administrar campos</Link><span>{data.workers} integrantes del equipo</span></footer>
  </main>
}
