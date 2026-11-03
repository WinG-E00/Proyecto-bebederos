import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Droplets,
  Filter,
  History,
  LayoutDashboard,
  Plus,
  ShieldAlert,
  User,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react'
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

const button =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-input bg-background hover:bg-muted px-4 py-2 text-sm font-semibold shadow-xs transition-colors focus-visible:outline-3 focus-visible:outline-[#d3a865] disabled:opacity-50'

const primaryButton =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 text-sm font-bold shadow-xs transition-colors focus-visible:outline-3 focus-visible:outline-[#d3a865] disabled:opacity-50'

export default function TaskList({ owner = false }) {
  const scope = useFarmScope(),
    [params] = useSearchParams()

  // activeTab: 'general' | 'validation' | 'completed'
  const [activeTab, setActiveTab] = useState('general')
  const [stateFilter, setStateFilter] = useState('')
  const [selectedWorkerId, setSelectedWorkerId] = useState(null)
  const [workerDropdownOpen, setWorkerDropdownOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)

  // Determinar el estado para la consulta según la pestaña
  const queryState = useMemo(() => {
    if (activeTab === 'validation') return 'Pendiente de validación'
    if (activeTab === 'completed') return 'Completada'
    return stateFilter
  }, [activeTab, stateFilter])

  const query = useTasks({
    farmId: scope.farmId,
    state: queryState,
    page,
    id: params.get('id'),
  })

  // Consulta auxiliar sin filtro de estado para calcular métricas generales
  const allTasksQuery = useTasks({
    farmId: scope.farmId,
    state: '',
    page: 1,
  })

  const team = useLiveQuery('team', owner ? '/team?limit=100' : null)
  const troughs = useLiveQuery(
    'troughs',
    owner && scope.farmId ? `/troughs?farmId=${scope.farmId}&limit=100` : null,
    scope.farmId || 'all',
  )

  const rawItems = params.get('id')
    ? query.data
      ? [query.data]
      : []
    : query.data?.items ?? []

  // Filtrado en memoria por peón seleccionado
  const items = useMemo(() => {
    if (!selectedWorkerId) return rawItems
    return rawItems.filter((t) => t.workerId === selectedWorkerId)
  }, [rawItems, selectedWorkerId])

  // Lista de peones disponibles
  const availableWorkers = useMemo(() => {
    const list = team.data?.items ?? []
    if (list.length) return list
    // Fallback: extraer trabajadores presentes en las tareas
    const map = new Map()
    for (const t of allTasksQuery.data?.items ?? []) {
      if (t.workerId && !map.has(t.workerId)) {
        map.set(t.workerId, {
          id: t.workerId,
          name: t.workerName ?? `Peón #${t.workerId}`,
          email: '',
          farmIds: [t.farmId],
        })
      }
    }
    return Array.from(map.values())
  }, [team.data?.items, allTasksQuery.data?.items])

  const selectedWorker = availableWorkers.find((w) => w.id === selectedWorkerId)

  // Métricas generales
  const metrics = useMemo(() => {
    const all = allTasksQuery.data?.items ?? []
    return {
      total: allTasksQuery.data?.total ?? all.length,
      pending: all.filter((t) => t.state === 'Pendiente').length,
      inProgress: all.filter((t) => t.state === 'En progreso').length,
      validation: all.filter((t) => t.state === 'Pendiente de validación').length,
      completed: all.filter((t) => t.state === 'Completada').length,
    }
  }, [allTasksQuery.data])

  function handleTabChange(tab) {
    setActiveTab(tab)
    setPage(1)
    if (tab === 'general') setStateFilter('')
  }

  return (
    <ResourceLayout
      title={owner ? 'Tareas' : 'Mis tareas'}
      scope={scope}
      query={query}
    >
      {scope.invalidScope ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No tenés acceso al establecimiento seleccionado.
        </div>
      ) : (
        <div className="space-y-5">
          {/* 1. Menú superior de navegación por secciones */}
          <nav
            aria-label="Vistas de tareas"
            className="flex flex-wrap items-center gap-2 border-b border-border pb-3"
          >
            <button
              type="button"
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all shadow-xs ${
                activeTab === 'general'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
              }`}
              onClick={() => handleTabChange('general')}
            >
              <LayoutDashboard size={17} />
              <span>Información general</span>
            </button>

            <button
              type="button"
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all shadow-xs ${
                activeTab === 'validation'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
              }`}
              onClick={() => handleTabChange('validation')}
            >
              <ShieldAlert size={17} />
              <span>Pendientes de aprobación</span>
              {metrics.validation > 0 && (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-extrabold ${
                    activeTab === 'validation'
                      ? 'bg-white text-amber-800'
                      : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {metrics.validation}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all shadow-xs ${
                activeTab === 'completed'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
              }`}
              onClick={() => handleTabChange('completed')}
            >
              <CheckCircle2 size={17} />
              <span>Tareas completadas</span>
              {metrics.completed > 0 && (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-extrabold ${
                    activeTab === 'completed'
                      ? 'bg-white text-blue-900'
                      : 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                  }`}
                >
                  {metrics.completed}
                </span>
              )}
            </button>
          </nav>

          {/* Tarjetas resumen de información general (solo visibles en pestaña 'general') */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Total tareas
                </span>
                <p className="mt-1 text-2xl font-black text-foreground">{metrics.total}</p>
              </div>

              <div className="rounded-2xl border border-blue-200 dark:border-blue-950/60 bg-blue-50/40 dark:bg-blue-950/20 p-4 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  En progreso
                </span>
                <p className="mt-1 text-2xl font-black text-blue-800 dark:text-blue-200">
                  {metrics.inProgress}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 dark:border-amber-950/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Por validar
                </span>
                <p className="mt-1 text-2xl font-black text-amber-800 dark:text-amber-200">
                  {metrics.validation}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Completadas
                </span>
                <p className="mt-1 text-2xl font-black text-emerald-800 dark:text-emerald-200">
                  {metrics.completed}
                </p>
              </div>
            </div>
          )}

          {/* 2. Barra de acciones: Botón de Peones desplegable, filtro de estado y nueva tarea */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Botón desplegable de Peones */}
              <div className="relative">
                <button
                  type="button"
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-xs transition-all border ${
                    selectedWorkerId
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                      : 'border-input bg-background hover:bg-muted text-foreground'
                  }`}
                  onClick={() => setWorkerDropdownOpen((prev) => !prev)}
                  aria-expanded={workerDropdownOpen}
                >
                  <Users size={16} className="text-emerald-600" />
                  <span>
                    {selectedWorker ? selectedWorker.name : 'Filtrar por peón'}
                  </span>
                  <ChevronDown
                    size={15}
                    className={`transition-transform duration-200 ${
                      workerDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Menú desplegable flotante con los peones */}
                {workerDropdownOpen && (
                  <div className="absolute left-0 top-full z-30 mt-1.5 w-72 rounded-2xl border border-border bg-card p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
                    <div className="border-b border-border px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Seleccionar peón responsable
                    </div>
                    <div className="max-h-64 space-y-1 overflow-y-auto py-1">
                      <button
                        type="button"
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition ${
                          !selectedWorkerId
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-bold'
                            : 'hover:bg-muted text-foreground'
                        }`}
                        onClick={() => {
                          setSelectedWorkerId(null)
                          setWorkerDropdownOpen(false)
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <Users size={14} />
                          <span>Todos los peones</span>
                        </span>
                        {!selectedWorkerId && <Check size={14} />}
                      </button>

                      {availableWorkers.map((w) => {
                        const isSelected = selectedWorkerId === w.id
                        return (
                          <button
                            key={w.id}
                            type="button"
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs sm:text-sm font-medium transition ${
                              isSelected
                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-bold'
                                : 'hover:bg-muted text-foreground'
                            }`}
                            onClick={() => {
                              setSelectedWorkerId(w.id)
                              setWorkerDropdownOpen(false)
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                                {(w.name || 'P').charAt(0).toUpperCase()}
                              </span>
                              <div className="min-w-0 truncate">
                                <p className="truncate leading-tight">{w.name}</p>
                                {w.email && (
                                  <p className="truncate text-[10px] text-muted-foreground font-normal">
                                    {w.email}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isSelected && <Check size={14} className="shrink-0 text-emerald-600" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Filtro por estado solo en pestaña 'general' */}
              {activeTab === 'general' && (
                <label className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
                  <Filter size={15} className="text-emerald-600 shrink-0" />
                  <span className="hidden sm:inline">Estado:</span>
                  <select
                    className="min-h-11 rounded-xl border border-input bg-background px-3 py-2 text-xs sm:text-sm font-semibold shadow-xs transition hover:border-emerald-600 focus-visible:outline-3 focus-visible:outline-[#d3a865]"
                    value={stateFilter}
                    onChange={(e) => {
                      setStateFilter(e.target.value)
                      setPage(1)
                    }}
                  >
                    <option value="">Todos los estados</option>
                    {states.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {/* Botón de crear tarea para el dueño */}
            {owner &&
              (scope.farmId ? (
                <button
                  className={primaryButton}
                  onClick={() => setCreating(true)}
                >
                  <Plus size={17} />
                  <span>Nueva tarea</span>
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Seleccioná un establecimiento para crear una tarea.
                </p>
              ))}
          </div>

          {/* Chip de filtro activo por peón */}
          {selectedWorker && (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 rounded-xl px-3 py-2">
              <UserCheck size={15} />
              <span>
                Mostrando únicamente tareas de: <strong>{selectedWorker.name}</strong>
              </span>
              <button
                type="button"
                className="ml-auto inline-flex items-center gap-1 hover:underline text-xs font-bold"
                onClick={() => setSelectedWorkerId(null)}
              >
                <X size={13} />
                <span>Quitar filtro</span>
              </button>
            </div>
          )}

          {/* Formulario de nueva tarea (para el dueño) */}
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

          {/* Conflicto de versión concurrente */}
          {query.conflict && (
            <div
              role="alert"
              className="space-y-3 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-5 shadow-xs"
            >
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200">
                <AlertCircle size={18} />
                <span>La tarea cambió en el servidor</span>
              </div>
              <p className="text-sm text-amber-900 dark:text-amber-300">
                Se consultó el estado actualizado. Revisá los datos antes de
                continuar.
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

          {/* Cuadrícula de tareas */}
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

          {items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
              {selectedWorker
                ? `No hay tareas asignadas a ${selectedWorker.name} en esta sección.`
                : activeTab === 'validation'
                ? 'No hay tareas pendientes de aprobación en este momento.'
                : activeTab === 'completed'
                ? 'No hay tareas completadas registradas.'
                : 'No hay tareas disponibles para este estado o campo.'}
            </div>
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

  const inputClass =
    'min-h-11 min-w-0 rounded-xl border border-input bg-background p-2.5 text-sm shadow-xs transition hover:border-emerald-600 focus-visible:outline-3 focus-visible:outline-[#d3a865]'

  return (
    <form
      className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-md"
      onSubmit={submit}
    >
      <div className="border-b border-border pb-3">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          Crear nueva tarea para el peón
        </h2>
        <p className="text-xs text-muted-foreground">
          Definí el título, instrucciones, prioridad y responsable.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 sm:col-span-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Título
          </span>
          <input
            className={inputClass}
            name="title"
            required
            maxLength={255}
            placeholder="Ej: Revisar válvula de corte potrero 4"
          />
        </label>

        <label className="grid gap-1 sm:col-span-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Descripción
          </span>
          <textarea
            className={`${inputClass} min-h-24`}
            name="description"
            required
            maxLength={10000}
            placeholder="Instrucciones claras para el trabajo a realizar…"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Prioridad
          </span>
          <select className={inputClass} name="priority" defaultValue="Media">
            {['Baja', 'Media', 'Alta'].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Fecha límite
          </span>
          <input
            className={inputClass}
            name="deadline"
            type="datetime-local"
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Peón responsable
          </span>
          <select className={inputClass} name="workerId" required defaultValue="">
            <option value="">Seleccionar peón</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} · {w.email}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Bebedero (opcional)
          </span>
          <select className={inputClass} name="troughId" defaultValue="">
            <option value="">Sin bebedero asignado</option>
            {troughs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!workers.length && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs font-medium text-amber-800 dark:text-amber-200">
          Asigná un peón a este establecimiento desde Equipo antes de crear una
          tarea.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {error.message}
          {error.fields &&
            Object.values(error.fields).map((m, i) => (
              <span className="block mt-1" key={i}>
                • {m}
              </span>
            ))}
        </p>
      )}

      <div className="flex gap-2.5 pt-2">
        <button className={primaryButton} disabled={pending || !workers.length}>
          <Check size={16} />
          <span>Guardar tarea</span>
        </button>
        <button
          className={button}
          type="button"
          disabled={pending}
          onClick={onCancel}
        >
          <X size={16} />
          <span>Cancelar</span>
        </button>
      </div>
    </form>
  )
}

function TaskCard({ task: t, owner, workers, disabled, act }) {
  const [reason, setReason] = useState(''),
    [workerId, setWorkerId] = useState('')

  const priorityStyles = {
    Alta: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    Media: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    Baja: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  }[t.priority] ?? 'bg-muted text-muted-foreground'

  return (
    <article className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:shadow-md">
      {/* Encabezado de la tarjeta */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${priorityStyles}`}>
              {t.priority}
            </span>
            <span className="inline-flex items-center rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-medium text-foreground">
              {t.state}
            </span>
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground leading-snug">
            {t.title}
          </h2>
        </div>
      </div>

      <p className="text-muted-foreground text-sm leading-relaxed">
        {t.description}
      </p>

      {/* Metadatos en caja estilizada */}
      <div className="rounded-xl bg-muted/40 p-3.5 space-y-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <User size={15} className="text-emerald-600 shrink-0" />
          <span>Responsable: <strong>{t.workerName ?? 'Sin responsable'}</strong></span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar size={15} className="text-emerald-600 shrink-0" />
          <span>Fecha límite: {formatDate(t.deadline)}</span>
        </div>
        {t.troughName && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Droplets size={15} className="text-emerald-600 shrink-0" />
            <span>Bebedero: {t.troughName}</span>
          </div>
        )}
      </div>

      {t.overdue && (
        <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl px-3 py-2 text-xs sm:text-sm">
          <AlertCircle size={16} />
          <span>Tarea vencida</span>
        </div>
      )}

      <div>
        <Link
          className="inline-flex min-h-11 items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          to={`/tasks?id=${t.id}${t.farmId ? `&farmId=${t.farmId}` : ''}`}
        >
          <History size={14} />
          <span>Ver historial de la tarea</span>
        </Link>
      </div>

      {/* Botones del Peón */}
      {!owner && t.state === 'Pendiente' && (
        <button
          className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-xl bg-emerald-700 px-5 text-white font-semibold shadow-xs hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-[#d3a865] disabled:opacity-50 transition-colors"
          disabled={disabled}
          onClick={() => act(t, 'start')}
        >
          Iniciar tarea
        </button>
      )}

      {!owner && t.state === 'En progreso' && (
        <button
          className="inline-flex min-h-11 w-full sm:w-auto items-center justify-center rounded-xl bg-blue-700 px-5 text-white font-semibold shadow-xs hover:bg-blue-800 focus-visible:outline-3 focus-visible:outline-[#d3a865] disabled:opacity-50 transition-colors"
          disabled={disabled}
          onClick={() => act(t, 'submit')}
        >
          Enviar a validación
        </button>
      )}

      {/* Acciones de Validación para el Dueño */}
      {owner && t.state === 'Pendiente de validación' && (
        <div className="space-y-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 p-3.5">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
            Validación de trabajo
          </p>
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 text-sm font-bold shadow-xs transition disabled:opacity-50"
            disabled={disabled || !t.workerId}
            onClick={() => act(t, 'approve')}
          >
            <CheckCircle2 size={16} />
            <span>Aprobar tarea</span>
          </button>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-foreground">Motivo del rechazo</span>
            <textarea
              className="min-h-16 min-w-0 rounded-xl border border-input bg-background p-2.5 text-xs shadow-xs focus-visible:outline-3 focus-visible:outline-[#d3a865]"
              value={reason}
              placeholder="Explicá qué corrección es necesaria…"
              maxLength={10000}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 text-sm font-bold shadow-xs transition disabled:opacity-50"
            disabled={disabled || !t.workerId || !reason.trim()}
            onClick={() => act(t, 'reject', { reason: reason.trim() })}
          >
            <XCircle size={16} />
            <span>Rechazar tarea</span>
          </button>
        </div>
      )}

      {/* Reasignación de responsable para el Dueño */}
      {owner && t.state !== 'Completada' && (
        <div className="grid gap-2 border-t border-border pt-3">
          <label className="grid gap-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Nuevo responsable
            </span>
            <select
              className="min-h-11 min-w-0 rounded-xl border border-input bg-background px-3 py-2 text-xs sm:text-sm font-medium shadow-xs focus-visible:outline-3 focus-visible:outline-[#d3a865]"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
            >
              <option value="">Seleccionar peón</option>
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

      {/* Historial de eventos */}
      {t.events && (
        <section className="border-t border-border pt-3 space-y-2">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Historial y comentarios
          </h3>
          <ol className="space-y-2 text-xs">
            {t.events.map((e) => (
              <li key={e.id} className="rounded-lg bg-muted/30 p-2 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground font-mono">
                  <span>{formatDate(e.occurredAt)}</span>
                  <span className="font-semibold text-foreground">{e.actorName}</span>
                </div>
                <p className="font-semibold text-foreground">
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
                  } · Nuevo estado: {e.newState}
                </p>
                {e.comment && (
                  <p className="text-muted-foreground italic bg-background/50 p-1.5 rounded">
                    Motivo: {e.comment}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  )
}
