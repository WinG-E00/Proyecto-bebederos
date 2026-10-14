import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useFarmScope } from '../../hooks/useFarmScope.js'
import { useTasks } from '../../hooks/useTasks.js'
import { useLiveQuery } from '../../hooks/useLiveQuery.js'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import Pagination from '../../components/Pagination.jsx'
import { formatDate } from '../../lib/dates.js'
const states = [
  'Pendiente',
  'En progreso',
  'Pendiente de validación',
  'Completada',
]
const button = 'min-h-11 rounded-lg border px-3 disabled:opacity-50'
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
  return (
    <ResourceLayout
      title={owner ? 'Tareas' : 'Mis tareas'}
      scope={scope}
      query={query}
    >
      {scope.invalidScope ? (
        <p>No tenés acceso al establecimiento seleccionado.</p>
      ) : (
        <>
          <label className="grid max-w-sm gap-1">
            Filtrar por estado
            <select
              className="min-h-11 rounded-lg border bg-background p-2"
              value={state}
              onChange={(e) => {
                setState(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todos</option>
              {states.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {owner &&
            (scope.farmId ? (
              <button className={button} onClick={() => setCreating(true)}>
                Nueva tarea
              </button>
            ) : (
              <p>Seleccioná un establecimiento para crear una tarea.</p>
            ))}
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
            <div role="alert" className="space-y-2 rounded-xl border p-4">
              <p>
                La tarea cambió. Se consultó el estado actualizado. Revisá los
                datos antes de continuar.
              </p>
              <button
                className={button}
                disabled={query.isFetching}
                onClick={query.reviewed}
              >
                Revisé el estado actualizado
              </button>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {items?.map((t) => (
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
          {query.data?.total === 0 && <p>No hay tareas disponibles.</p>}
          {!params.get('id') && (
            <Pagination query={query} page={page} setPage={setPage} />
          )}
        </>
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
  const input = 'min-h-11 min-w-0 rounded-lg border bg-background p-2'
  return (
    <form
      className="grid gap-3 rounded-xl border bg-card p-4"
      onSubmit={submit}
    >
      <label className="grid gap-1">
        Título
        <input className={input} name="title" required maxLength={255} />
      </label>
      <label className="grid gap-1">
        Descripción
        <textarea
          className={input}
          name="description"
          required
          maxLength={10000}
        />
      </label>
      <label className="grid gap-1">
        Prioridad
        <select className={input} name="priority" defaultValue="Media">
          {['Baja', 'Media', 'Alta'].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        Fecha límite
        <input
          className={input}
          name="deadline"
          type="datetime-local"
          required
        />
      </label>
      <label className="grid gap-1">
        Peón responsable
        <select className={input} name="workerId" required defaultValue="">
          <option value="">Seleccionar</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} · {w.email}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        Bebedero (opcional)
        <select className={input} name="troughId" defaultValue="">
          <option value="">Sin bebedero</option>
          {troughs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      {!workers.length && (
        <p>
          Asigná un peón a este establecimiento desde Equipo antes de crear una
          tarea.
        </p>
      )}
      {error && (
        <p role="alert">
          {error.message}
          {error.fields &&
            Object.values(error.fields).map((m, i) => (
              <span className="block" key={i}>
                {m}
              </span>
            ))}
        </p>
      )}
      <div className="flex gap-2">
        <button className={button} disabled={pending || !workers.length}>
          Guardar tarea
        </button>
        <button
          className={button}
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
  return (
    <article className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
      <h2 className="text-xl font-semibold">{t.title}</h2>
      <p>{t.description}</p>
      <p>
        Estado: {t.state} · Prioridad: {t.priority}
      </p>
      <p>Responsable: {t.workerName ?? 'Sin responsable'}</p>
      <p>Fecha límite: {formatDate(t.deadline)}</p>
      {t.overdue && <p className="font-semibold">Tarea vencida</p>}
      {t.troughName && <p>Bebedero: {t.troughName}</p>}
      <Link
        className="inline-flex min-h-11 items-center underline"
        to={`/tasks?id=${t.id}${t.farmId ? `&farmId=${t.farmId}` : ''}`}
      >
        Ver historial de la tarea
      </Link>
      {!owner && t.state === 'Pendiente' && (
        <button
          className={button}
          disabled={disabled}
          onClick={() => act(t, 'start')}
        >
          Iniciar tarea
        </button>
      )}
      {!owner && t.state === 'En progreso' && (
        <button
          className={button}
          disabled={disabled}
          onClick={() => act(t, 'submit')}
        >
          Enviar a validación
        </button>
      )}
      {owner && t.state === 'Pendiente de validación' && (
        <div className="grid gap-2">
          <button
            className={button}
            disabled={disabled || !t.workerId}
            onClick={() => act(t, 'approve')}
          >
            Aprobar tarea
          </button>
          <label className="grid gap-1">
            Motivo del rechazo
            <textarea
              className="min-h-11 min-w-0 rounded-lg border bg-background p-2"
              value={reason}
              maxLength={10000}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className={button}
            disabled={disabled || !t.workerId || !reason.trim()}
            onClick={() => act(t, 'reject', { reason: reason.trim() })}
          >
            Rechazar tarea
          </button>
        </div>
      )}
      {owner && t.state !== 'Completada' && (
        <div className="grid gap-2">
          <label className="grid gap-1">
            Nuevo responsable
            <select
              className="min-h-11 min-w-0 rounded-lg border bg-background p-2"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
            >
              <option value="">Seleccionar</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className={button}
            disabled={disabled || !workerId}
            onClick={() => act(t, 'assign', { workerId: Number(workerId) })}
          >
            Asignar responsable
          </button>
        </div>
      )}
      {t.events && (
        <section>
          <h3 className="font-semibold">Historial y comentarios</h3>
          <ol className="space-y-2">
            {t.events.map((e) => (
              <li key={e.id} className="border-t py-2">
                <p>
                  {formatDate(e.occurredAt)} · {e.actorName} · {e.newState}
                </p>
                <p>
                  {
                    {
                      created: 'Creación',
                      start: 'Inicio',
                      submit: 'Envío a validación',
                      approve: 'Aprobación',
                      reject: 'Rechazo',
                      assign: 'Reasignación',
                      revoke: 'Acceso retirado',
                    }[e.action]
                  }
                </p>
                {e.comment && <p>Motivo: {e.comment}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  )
}
