import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRightLeft,
  CalendarClock,
  CheckCheck,
  CircleCheckBig,
  CircleDashed,
  CirclePlay,
  ClipboardList,
  Droplets,
  Fence,
  Flag,
  History,
  Hourglass,
  ListTodo,
  MessageSquare,
  Play,
  Plus,
  Send,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  UserRound,
  Wrench,
  X,
} from 'lucide-react'
import { useFarmScope } from '../../hooks/useFarmScope.js'
import { useTasks } from '../../hooks/useTasks.js'
import { useLiveQuery } from '../../hooks/useLiveQuery.js'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import Pagination from '../../components/Pagination.jsx'
import { EmptyResources, MetricCard } from '../../components/ManagementUI.jsx'
import CowIcon from '../../components/icons/CowIcon.jsx'
import { formatDate } from '../../lib/dates.js'
import './TaskList.css'

const states = [
  'Pendiente',
  'En progreso',
  'Pendiente de validación',
  'Completada',
]
const stateStyle = {
  Pendiente: { tone: 'pending', Icon: CircleDashed },
  'En progreso': { tone: 'progress', Icon: CirclePlay },
  'Pendiente de validación': { tone: 'review', Icon: Hourglass },
  Completada: { tone: 'done', Icon: CircleCheckBig },
}
const priorityTone = { Alta: 'high', Media: 'medium', Baja: 'low' }
const actionStyle = {
  created: ['Creación', Plus],
  start: ['Inicio', Play],
  submit: ['Envío a validación', Send],
  approve: ['Aprobación', CheckCheck],
  reject: ['Rechazo', X],
  assign: ['Reasignación', ArrowRightLeft],
  revoke: ['Acceso retirado', ShieldCheck],
}

// Ícono representativo según de qué trata la tarea (bebedero, animales, alambrado o mantenimiento).
function taskKind(t) {
  const text = `${t.title} ${t.description}`.toLocaleLowerCase('es-AR')
  if (t.troughName || /agua|bebedero|flotante|caño|tanque|represa/.test(text)) return { Icon: Droplets, tone: 'water', label: 'Agua' }
  if (/animal|vaca|ganado|rodeo|ternero|hacienda|vacun/.test(text)) return { Icon: CowIcon, tone: 'cattle', label: 'Hacienda' }
  if (/alambr|cerco|tranquera|potrero|poste/.test(text)) return { Icon: Fence, tone: 'field', label: 'Campo' }
  if (/repar|arregl|mantenim|bomba|molino|limpi/.test(text)) return { Icon: Wrench, tone: 'repair', label: 'Mantenimiento' }
  return { Icon: ClipboardList, tone: 'general', label: 'General' }
}

export default function TaskList({ owner = false }) {
  const scope = useFarmScope(),
    [params] = useSearchParams()
  const [state, setState] = useState(''),
    [page, setPage] = useState(1),
    [creating, setCreating] = useState(false)
  const query = useTasks({
    farmId: scope.farmId,
    state,
    page,
    id: params.get('id'),
  })
  const team = useLiveQuery('team', owner ? '/team?limit=100' : null)
  const troughs = useLiveQuery(
    'troughs',
    owner && scope.farmId ? `/troughs?farmId=${scope.farmId}&limit=100` : null,
    scope.farmId || 'all',
  )
  const items = params.get('id')
    ? query.data
      ? [query.data]
      : []
    : query.data?.items
  const list = items ?? []
  const partial = !params.get('id') && query.data?.total > list.length
  const count = (s) => list.filter((t) => t.state === s).length
  return (
    <ResourceLayout
      title={owner ? 'Tareas' : 'Mis tareas'}
      scope={scope}
      query={query}
      redesigned
      eyebrow="Trabajo de campo"
      description={
        owner
          ? 'Asigná recorridas y arreglos a tu equipo y validá el trabajo terminado.'
          : 'Tus recorridas y arreglos asignados. Iniciá cada tarea y enviala a validar al terminar.'
      }
      actions={
        !scope.invalidScope &&
        owner &&
        scope.farmId && (
          <button
            className="primary-button min-h-11"
            onClick={() => setCreating(true)}
          >
            <Plus size={18} aria-hidden="true" />
            Nueva tarea
          </button>
        )
      }
    >
      {scope.invalidScope ? (
        <p>No tenés acceso al establecimiento seleccionado.</p>
      ) : (
        <div className="tasks-board">
          {owner && !scope.farmId && (
            <p className="management-notice">
              Seleccioná un establecimiento para crear una tarea.
            </p>
          )}
          {query.data && !params.get('id') && (
            <section className="metrics-grid" aria-label="Resumen de tareas">
              <MetricCard icon={CircleDashed} label="Pendientes" value={count('Pendiente')} detail={partial ? 'En esta página' : 'Sin comenzar'} tone="ochre" />
              <MetricCard icon={CirclePlay} label="En progreso" value={count('En progreso')} detail={partial ? 'En esta página' : 'En el campo ahora'} tone="blue" />
              <MetricCard icon={Hourglass} label="Por validar" value={count('Pendiente de validación')} detail={partial ? 'En esta página' : 'Esperan revisión'} />
              <MetricCard icon={TriangleAlert} label="Vencidas" value={list.filter((t) => t.overdue).length} detail={partial ? 'En esta página' : 'Fuera de plazo'} tone="red" />
            </section>
          )}
          <div
            className="tasks-filters"
            role="group"
            aria-label="Filtrar por estado"
          >
            {[['', 'Todas', ListTodo], ...states.map((s) => [s, s, stateStyle[s].Icon])].map(([value, label, Icon]) => (
              <button
                key={label}
                type="button"
                aria-pressed={state === value}
                onClick={() => {
                  setState(value)
                  setPage(1)
                }}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          {creating && scope.farmId && (
            <TaskForm
              key={scope.farmId}
              workers={(team.data?.items ?? []).filter((w) =>
                w.farmIds.includes(Number(scope.farmId)),
              )}
              troughs={troughs.data?.items ?? []}
              pending={query.pending}
              onSave={async (b) => {
                await query.create(b)
                setCreating(false)
              }}
              onCancel={() => setCreating(false)}
            />
          )}
          {query.conflict && (
            <div role="alert" className="tasks-conflict">
              <TriangleAlert size={20} aria-hidden="true" />
              <p>
                La tarea cambió. Se consultó el estado actualizado. Revisá los
                datos antes de continuar.
              </p>
              <button
                className="secondary-button min-h-11"
                disabled={query.isFetching}
                onClick={query.reviewed}
              >
                Revisé el estado actualizado
              </button>
            </div>
          )}
          <div className="tasks-grid">
            {list.map((t) => (
              <TaskCard
                key={`${t.id}:${t.version}`}
                task={t}
                owner={owner}
                workers={(team.data?.items ?? []).filter((w) =>
                  w.farmIds.includes(t.farmId),
                )}
                disabled={
                  query.pending ||
                  !!query.conflict ||
                  query.denied ||
                  query.isFetching
                }
                act={query.act}
              />
            ))}
          </div>
          {query.data?.total === 0 && (
            <EmptyResources
              icon={ClipboardList}
              title="No hay tareas disponibles."
              description={state ? `No hay tareas en estado «${state}».` : undefined}
            />
          )}
          {!params.get('id') && (
            <Pagination query={query} page={page} setPage={setPage} />
          )}
        </div>
      )}
    </ResourceLayout>
  )
}

function TaskForm({ workers, troughs, pending, onSave, onCancel }) {
  const [error, setError] = useState(null)
  async function submit(e) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setError(null)
    try {
      await onSave({
        title: f.get('title'),
        description: f.get('description'),
        priority: f.get('priority'),
        deadline: new Date(f.get('deadline')).toISOString(),
        workerId: Number(f.get('workerId')),
        troughId: f.get('troughId') ? Number(f.get('troughId')) : null,
      })
    } catch (err) {
      setError(err)
    }
  }
  return (
    <form className="task-form" onSubmit={submit}>
      <header>
        <span className="task-kind general"><ClipboardList size={20} aria-hidden="true" /></span>
        <div>
          <h2>Nueva tarea</h2>
          <p>Completá los datos y asignala a un peón del establecimiento.</p>
        </div>
      </header>
      <label className="task-form-wide">
        Título
        <input name="title" required maxLength={255} />
      </label>
      <label className="task-form-wide">
        Descripción
        <textarea name="description" required maxLength={10000} />
      </label>
      <label>
        Prioridad
        <select name="priority" defaultValue="Media">
          {['Baja', 'Media', 'Alta'].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <label>
        Fecha límite
        <input name="deadline" type="datetime-local" required />
      </label>
      <label>
        Peón responsable
        <select name="workerId" required defaultValue="">
          <option value="">Seleccionar</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} · {w.email}
            </option>
          ))}
        </select>
      </label>
      <label>
        Bebedero (opcional)
        <select name="troughId" defaultValue="">
          <option value="">Sin bebedero</option>
          {troughs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      {!workers.length && (
        <p className="management-notice task-form-wide">
          Asigná un peón a este establecimiento desde Equipo antes de crear una
          tarea.
        </p>
      )}
      {error && (
        <p role="alert" className="task-form-error task-form-wide">
          {error.message}
          {error.fields &&
            Object.values(error.fields).map((m, i) => (
              <span className="block" key={i}>
                {m}
              </span>
            ))}
        </p>
      )}
      <div className="task-actions task-form-wide">
        <button className="primary-button min-h-11" disabled={pending || !workers.length}>
          Guardar tarea
        </button>
        <button
          className="secondary-button min-h-11"
          type="button"
          disabled={pending}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

function TaskCard({ task: t, owner, workers, disabled, act }) {
  const [reason, setReason] = useState(''),
    [workerId, setWorkerId] = useState('')
  const kind = taskKind(t)
  const status = stateStyle[t.state] ?? stateStyle.Pendiente
  const step = states.indexOf(t.state)
  return (
    <article className={`task-card${t.overdue ? ' task-card--overdue' : ''}`}>
      <header className="task-card-head">
        <span className={`task-kind ${kind.tone}`} title={kind.label}>
          <kind.Icon size={22} aria-hidden="true" />
        </span>
        <div className="task-card-title">
          <h2>{t.title}</h2>
          <div className="task-chips">
            <span className={`task-chip state-${status.tone}`}>
              <status.Icon size={14} aria-hidden="true" />
              <span className="sr-only">Estado: </span>
              {t.state}
            </span>
            <span className={`task-chip priority-chip-${priorityTone[t.priority] ?? 'medium'}`}>
              <Flag size={14} aria-hidden="true" />
              Prioridad {t.priority?.toLocaleLowerCase('es-AR')}
            </span>
            {t.overdue && (
              <span className="task-chip task-chip--overdue">
                <TriangleAlert size={14} aria-hidden="true" />
                <span>Tarea vencida</span>
              </span>
            )}
          </div>
        </div>
      </header>

      <p className="task-description">{t.description}</p>

      <ol className="task-steps" aria-label={`Avance: paso ${step + 1} de ${states.length}`}>
        {states.map((s, i) => (
          <li key={s} className={i < step ? 'done' : i === step ? 'current' : ''} title={s} />
        ))}
      </ol>

      <dl className="task-meta-list">
        <div>
          <dt><UserRound size={16} aria-hidden="true" />Responsable</dt>
          <dd>{t.workerName ?? 'Sin responsable'}</dd>
        </div>
        <div className={t.overdue ? 'is-late' : ''}>
          <dt><CalendarClock size={16} aria-hidden="true" />Fecha límite</dt>
          <dd>{formatDate(t.deadline)}</dd>
        </div>
        {t.troughName && (
          <div>
            <dt><Droplets size={16} aria-hidden="true" />Bebedero</dt>
            <dd>{t.troughName}</dd>
          </div>
        )}
      </dl>

      <div className="task-actions">
        {!owner && t.state === 'Pendiente' && (
          <button
            className="primary-button min-h-11"
            disabled={disabled}
            onClick={() => act(t, 'start')}
          >
            <Play size={16} aria-hidden="true" />
            Iniciar tarea
          </button>
        )}
        {!owner && t.state === 'En progreso' && (
          <button
            className="primary-button min-h-11"
            disabled={disabled}
            onClick={() => act(t, 'submit')}
          >
            <Send size={16} aria-hidden="true" />
            Enviar a validación
          </button>
        )}
        <Link
          className="task-history-link min-h-11"
          to={`/tasks?id=${t.id}${t.farmId ? `&farmId=${t.farmId}` : ''}`}
        >
          <History size={16} aria-hidden="true" />
          Ver historial de la tarea
        </Link>
      </div>

      {owner && t.state === 'Pendiente de validación' && (
        <section className="task-panel task-panel--review" aria-label="Validar tarea">
          <button
            className="primary-button min-h-11"
            disabled={disabled || !t.workerId}
            onClick={() => act(t, 'approve')}
          >
            <CheckCheck size={16} aria-hidden="true" />
            Aprobar tarea
          </button>
          <label>
            Motivo del rechazo
            <textarea
              value={reason}
              maxLength={10000}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className="danger-outline min-h-11"
            disabled={disabled || !t.workerId || !reason.trim()}
            onClick={() => act(t, 'reject', { reason: reason.trim() })}
          >
            <X size={16} aria-hidden="true" />
            Rechazar tarea
          </button>
        </section>
      )}
      {owner && t.state !== 'Completada' && (
        <section className="task-panel task-panel--assign" aria-label="Reasignar tarea">
          <label>
            Nuevo responsable
            <select value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
              <option value="">Seleccionar</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary-button min-h-11"
            disabled={disabled || !workerId}
            onClick={() => act(t, 'assign', { workerId: Number(workerId) })}
          >
            <UserCog size={16} aria-hidden="true" />
            Asignar responsable
          </button>
        </section>
      )}
      {t.events && (
        <section className="task-timeline">
          <h3>Historial y comentarios</h3>
          <ol>
            {t.events.map((e) => {
              const [label, Icon] = actionStyle[e.action] ?? ['Evento', History]
              return (
                <li key={e.id} className={`event-${e.action}`}>
                  <span className="task-timeline-dot"><Icon size={14} aria-hidden="true" /></span>
                  <div>
                    <p className="task-timeline-title">{label}</p>
                    <p>
                      {formatDate(e.occurredAt)} · {e.actorName} · {e.newState}
                    </p>
                    {e.comment && (
                      <p className="task-timeline-comment">
                        <MessageSquare size={14} aria-hidden="true" />
                        <span>Motivo: {e.comment}</span>
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </article>
  )
}
