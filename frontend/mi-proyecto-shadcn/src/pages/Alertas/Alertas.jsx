import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  BellRing,
  CheckCheck,
  ChevronDown,
  CircleCheckBig,
  CircleHelp,
  Clock,
  Droplet,
  Droplets,
  ExternalLink,
  Gauge,
  Info,
  Lightbulb,
  MapPinOff,
  MapPin,
  MessageSquare,
  Send,
  ShieldAlert,
  TriangleAlert,
  UserCog,
  WifiOff,
  X,
  Plus,
} from 'lucide-react'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import Pagination from '../../components/Pagination.jsx'
import AsyncState from '../../components/AsyncState.jsx'
import { EmptyResources, MetricCard } from '../../components/ManagementUI.jsx'
import CowIcon from '../../components/icons/CowIcon.jsx'
import { useFarmScope } from '../../hooks/useFarmScope.js'
import { useAlerts, useNotifications, useReadNotification } from '../../hooks/useAlerts.js'
import { formatDate } from '../../lib/dates.js'
import './Alertas.css'

// Explicación de cada condición que genera el sistema (ver database/services/alerts.service.js).
const conditions = {
  water_critical: {
    level: 'urgent', Icon: Droplet,
    meaning: 'El bebedero tiene muy poca agua. Los animales pueden quedarse sin tomar en poco tiempo.',
    steps: ['Ir al bebedero cuanto antes y verificar el nivel.', 'Revisar el flotante, la bomba o la cañería de entrada.', 'Si hace calor, priorizar esta alerta sobre las demás.'],
  },
  water_low: {
    level: 'warning', Icon: Gauge,
    meaning: 'El nivel de agua está por debajo de lo normal, pero todavía no es crítico.',
    steps: ['Programar una recorrida para revisarlo hoy.', 'Verificar que el bebedero se esté reponiendo.'],
  },
  water_missing: {
    level: 'warning', Icon: WifiOff,
    meaning: 'El sensor de este bebedero nunca envió una medición, así que no sabemos cuánta agua tiene.',
    steps: ['Revisar que el sensor esté instalado y con batería.', 'Mientras tanto, controlar el nivel a ojo en la recorrida.'],
  },
  water_stale: {
    level: 'review', Icon: Clock,
    meaning: 'El sensor dejó de enviar datos hace un tiempo. El último nivel conocido puede no ser el actual.',
    steps: ['Revisar la conexión o la batería del sensor.', 'Confirmar el nivel en persona si el bebedero es importante.'],
  },
  gps_missing: {
    level: 'warning', Icon: MapPinOff,
    meaning: 'El collar GPS de este animal nunca envió una ubicación.',
    steps: ['Verificar que el collar esté colocado y encendido.', 'Ubicar al animal en la próxima recorrida.'],
  },
  gps_stale: {
    level: 'review', Icon: MapPin,
    meaning: 'Hace un tiempo que no recibimos la ubicación de este animal. Puede ser batería baja o falta de señal.',
    steps: ['Revisar la última posición conocida en el mapa.', 'Controlar el collar y su batería.'],
  },
}
const fallback = { level: 'review', Icon: Info, meaning: 'El sistema detectó una condición que conviene revisar.', steps: ['Abrir la ficha del recurso para ver el detalle.'] }
const levels = [
  { id: 'urgent', title: 'Urgentes', hint: 'Actuá cuanto antes', Icon: ShieldAlert },
  { id: 'warning', title: 'Requieren atención', hint: 'Revisalas hoy', Icon: TriangleAlert },
  { id: 'review', title: 'Para revisar', hint: 'Datos que dejaron de llegar', Icon: Clock },
]
const notificationKinds = [
  [/^Nueva tarea/, Plus, 'new'],
  [/^Te asignaron/, UserCog, 'assign'],
  [/^Aprobaron/, CheckCheck, 'approve'],
  [/^Rechazaron/, X, 'reject'],
  [/^(Envi|Enviaron)/, Send, 'submit'],
]
function notificationKind(message) {
  const match = notificationKinds.find(([pattern]) => pattern.test(message))
  return match ? { Icon: match[1], tone: match[2] } : { Icon: MessageSquare, tone: 'other' }
}

function sinceText(date) {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000)
  if (!Number.isFinite(minutes) || minutes < 0) return ''
  if (minutes < 1) return 'Recién'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.round(hours / 24)
  return `Hace ${days} ${days === 1 ? 'día' : 'días'}`
}

export default function Alertas() {
  const scope = useFarmScope(), [active, setActive] = useState(true), [page, setPage] = useState(1), [messagePage, setMessagePage] = useState(1)
  const alerts = useAlerts(scope.farmId, active, page), messages = useNotifications(scope.farmId, messagePage), read = useReadNotification()
  const items = alerts.data?.items ?? []
  const partial = alerts.data?.total > items.length
  const farmName = id => scope.farms.data?.items.find(f => f.id === id)?.name ?? `Campo #${id}`
  const byLevel = id => items.filter(a => (conditions[a.conditionName] ?? fallback).level === id)
  const unread = (messages.data?.items ?? []).filter(m => !m.readAt).length
  const detail = text => (partial ? 'En esta página' : text)

  return <ResourceLayout title="Alertas y notificaciones" scope={scope} query={alerts} redesigned eyebrow="Monitoreo"
    description="El sistema revisa los bebederos y los collares GPS y te avisa cuando algo necesita tu atención.">
    <div className="alerts-board">
      <details className="alerts-help">
        <summary><CircleHelp size={20} aria-hidden="true" /><span>¿Cómo funcionan las alertas?</span><ChevronDown className="alerts-chevron" size={18} aria-hidden="true" /></summary>
        <div className="alerts-help-body">
          <div><BellRing size={18} aria-hidden="true" /><p><strong>Se crean solas.</strong> Cada vez que llega una medición, el sistema revisa el nivel de agua y la última señal de cada sensor.</p></div>
          <div><CircleCheckBig size={18} aria-hidden="true" /><p><strong>Se resuelven solas.</strong> Cuando el problema desaparece (por ejemplo, el bebedero se llena), la alerta pasa a “Resueltas”.</p></div>
          <div><Lightbulb size={18} aria-hidden="true" /><p><strong>Empezá por las urgentes.</strong> Abrí “¿Qué significa y qué hago?” en cada alerta para ver los pasos recomendados.</p></div>
        </div>
      </details>

      {alerts.data && active && <section className="metrics-grid" aria-label="Resumen de alertas">
        <MetricCard icon={ShieldAlert} label="Urgentes" value={byLevel('urgent').length} detail={detail('Agua crítica')} tone="red" />
        <MetricCard icon={TriangleAlert} label="Requieren atención" value={byLevel('warning').length} detail={detail('Nivel bajo o sin sensor')} tone="ochre" />
        <MetricCard icon={Clock} label="Para revisar" value={byLevel('review').length} detail={detail('Datos desactualizados')} tone="blue" />
        <MetricCard icon={Bell} label="Notificaciones sin leer" value={messages.data ? unread : undefined} detail="Sobre tus tareas" />
      </section>}

      <div className="alerts-toolbar">
        <label>
          <span>Estado de alertas</span>
          <select value={String(active)} onChange={e => { setActive(e.target.value === 'true'); setPage(1) }}>
            <option value="true">Activas</option>
            <option value="false">Resueltas</option>
          </select>
        </label>
        {alerts.data && <p role="status">{alerts.data.total} {alerts.data.total === 1 ? 'alerta' : 'alertas'} {active ? (alerts.data.total === 1 ? 'activa' : 'activas') : (alerts.data.total === 1 ? 'resuelta' : 'resueltas')}</p>}
      </div>

      {alerts.data?.total === 0 && <EmptyResources icon={CircleCheckBig} title={`No hay alertas ${active ? 'activas' : 'resueltas'}.`}
        description={active ? 'Todo en orden: los bebederos y los GPS están enviando datos normales.' : undefined} />}

      {active
        ? levels.map(level => {
          const group = byLevel(level.id)
          if (!group.length) return null
          return <details key={level.id} className={`alerts-group level-${level.id}`} open>
            <summary>
              <span className="alerts-group-icon"><level.Icon size={20} aria-hidden="true" /></span>
              <span className="alerts-group-copy"><strong>{level.title}</strong><small>{level.hint}</small></span>
              <span className="alerts-count">{group.length}</span>
              <ChevronDown className="alerts-chevron" size={20} aria-hidden="true" />
            </summary>
            <div className="alerts-grid">{group.map(a => <AlertCard key={a.id} alert={a} farmName={farmName(a.farmId)} />)}</div>
          </details>
        })
        : items.length > 0 && <div className="alerts-grid">{items.map(a => <AlertCard key={a.id} alert={a} farmName={farmName(a.farmId)} />)}</div>}
      <Pagination query={alerts} page={page} setPage={setPage} />

      <details className="alerts-group alerts-notifications" open>
        <summary>
          <span className="alerts-group-icon"><Bell size={20} aria-hidden="true" /></span>
          <span className="alerts-group-copy"><h2>Notificaciones de tareas</h2><small>Asignaciones, aprobaciones y rechazos de tus tareas</small></span>
          {unread > 0 && <span className="alerts-count">{unread} sin leer</span>}
          <ChevronDown className="alerts-chevron" size={20} aria-hidden="true" />
        </summary>
        <div className="alerts-notification-body">
          <AsyncState loading={messages.isPending} error={messages.error || read.error} onRetry={() => messages.refetch()} />
          {messages.stale && <p role="status">Sin conexión. Mensajes anteriores.</p>}
          {messages.data?.total === 0 && <p className="alerts-empty-line"><CheckCheck size={18} aria-hidden="true" />No hay notificaciones.</p>}
          <ul className="notification-list">
            {messages.data?.items.map(m => {
              const kind = notificationKind(m.message)
              return <li key={m.id} className={`notification-item${m.readAt ? '' : ' is-unread'}`}>
                <span className={`notification-icon tone-${kind.tone}`}><kind.Icon size={17} aria-hidden="true" /></span>
                <div className="notification-copy">
                  <p className="notification-message">{m.message}</p>
                  <p className="notification-meta">{formatDate(m.occurredAt)} · {m.readAt ? 'Leída' : <strong>Sin leer</strong>}</p>
                </div>
                {!m.readAt && <button className="secondary-button min-h-11" disabled={read.isPending} onClick={() => read.mutate(m.id)}>
                  <CheckCheck size={16} aria-hidden="true" />Marcar como leída
                </button>}
              </li>
            })}
          </ul>
          <Pagination query={messages} page={messagePage} setPage={setMessagePage} />
        </div>
      </details>
    </div>
  </ResourceLayout>
}

function AlertCard({ alert: a, farmName }) {
  const info = conditions[a.conditionName] ?? fallback
  const trough = a.resourceType === 'trough'
  const ResourceIcon = trough ? Droplets : CowIcon
  return <article className={`alert-card level-${a.resolvedAt ? 'resolved' : info.level}`}>
    <header className="alert-card-head">
      <span className="alert-card-icon"><info.Icon size={22} aria-hidden="true" /></span>
      <div>
        <h3>{a.message}</h3>
        <p className="alert-card-meta">
          <span><ResourceIcon size={15} aria-hidden="true" />{trough ? 'Bebedero' : 'Animal'} #{a.resourceId}</span>
          <span><MapPin size={15} aria-hidden="true" />{farmName}</span>
        </p>
      </div>
    </header>
    <div className="alert-card-times">
      <span className={`alert-pill ${a.resolvedAt ? 'is-resolved' : ''}`}>
        {a.resolvedAt ? <CircleCheckBig size={14} aria-hidden="true" /> : <BellRing size={14} aria-hidden="true" />}
        {a.resolvedAt ? 'Resuelta' : 'Activa'}
      </span>
      <span title={formatDate(a.generatedAt)}><Clock size={14} aria-hidden="true" />{sinceText(a.generatedAt) || formatDate(a.generatedAt)}</span>
    </div>
    <p className="alert-card-dates">Generada: {formatDate(a.generatedAt)}{a.resolvedAt && <><br />Resolución: {formatDate(a.resolvedAt)}</>}</p>
    <details className="alert-explain">
      <summary><Lightbulb size={16} aria-hidden="true" />¿Qué significa y qué hago?<ChevronDown className="alerts-chevron" size={16} aria-hidden="true" /></summary>
      <p>{info.meaning}</p>
      <ol>{info.steps.map(step => <li key={step}>{step}</li>)}</ol>
    </details>
    <Link className="alert-card-link min-h-11" to={`/${trough ? 'troughs' : 'animals'}?farmId=${a.farmId}&id=${a.resourceId}`}>
      {trough ? 'Ver bebedero' : 'Ver animal'}<ExternalLink size={15} aria-hidden="true" />
    </Link>
  </article>
}
