import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { Check, ChevronDown, Edit3, Mail, MapPin, Users, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import { useLiveQuery } from '../../hooks/useLiveQuery.js'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import ConfirmAction from '../../components/ConfirmAction.jsx'
import Pagination from '../../components/Pagination.jsx'
import Invitations, { FarmChoices } from './Invitations.jsx'
import { api } from '../../services/api.js'

export default function Peones() {
  const { account } = useAuth(),
    client = useQueryClient()
  const [page, setPage] = useState(1),
    [editing, setEditing] = useState(null),
    [selected, setSelected] = useState([]),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState(null)
  // Track which farms are expanded
  const [expandedFarms, setExpandedFarms] = useState({})
  const query = useLiveQuery(
      'team',
      account.role === 'owner' ? `/team?page=${page}` : null,
    ),
    farms = useLiveQuery('farms', '/farms?limit=100')

  if (account.role !== 'owner') return <Navigate to="/dashboard" replace />

  async function refresh() {
    await client.invalidateQueries({ queryKey: ['account', account.id] })
  }

  function toggleFarm(farmId) {
    setExpandedFarms((prev) => ({ ...prev, [farmId]: !prev[farmId] }))
  }

  // Build a map: farmId -> list of workers assigned to it
  const farmWorkerMap = useMemo(() => {
    const map = new Map()
    const farmList = farms.data?.items ?? []
    const workers = query.data?.items ?? []
    for (const farm of farmList) {
      map.set(farm.id, {
        farm,
        workers: workers.filter((w) => w.farmIds.includes(farm.id)),
      })
    }
    return map
  }, [farms.data?.items, query.data?.items])

  const farmEntries = useMemo(() => Array.from(farmWorkerMap.values()), [farmWorkerMap])

  return (
    <ResourceLayout title="Equipo" query={query}>
      {/* Caja de introducción */}
      <div className="flex items-start gap-3.5 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Users size={22} aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-foreground">Gestión de personal del campo</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Tocá un establecimiento para ver los peones asignados. Desde cada peón podés editar sus asignaciones.
          </p>
        </div>
      </div>

      {/* Lista de establecimientos desplegables */}
      <div className="space-y-3">
        {farmEntries.map(({ farm, workers: farmWorkers }) => {
          const isOpen = expandedFarms[farm.id] ?? false
          return (
            <div
              key={farm.id}
              className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden transition-all"
            >
              {/* Botón desplegable del establecimiento */}
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-muted/50 focus-visible:outline-3 focus-visible:outline-[#d3a865]"
                onClick={() => toggleFarm(farm.id)}
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-sm shadow-xs">
                    <MapPin size={20} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-foreground truncate">{farm.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {farmWorkers.length === 0
                        ? 'Sin peones asignados'
                        : `${farmWorkers.length} ${farmWorkers.length === 1 ? 'peón asignado' : 'peones asignados'}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                    farmWorkers.length > 0
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {farmWorkers.length}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Contenido expandido: peones de este establecimiento */}
              {isOpen && (
                <div className="border-t border-border bg-muted/20 p-4 sm:p-5 space-y-3">
                  {farmWorkers.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No hay peones asignados a este establecimiento. Podés invitar uno desde la sección de invitaciones.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {farmWorkers.map((w) => (
                        <article
                          key={w.id}
                          className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs transition hover:shadow-md"
                        >
                          <div className="flex items-start gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-xs shadow-xs">
                              {(w.name || 'P').charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 space-y-0.5">
                              <h4 className="text-sm font-bold tracking-tight text-foreground truncate">
                                {w.name}
                              </h4>
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                                <Mail size={12} className="shrink-0 text-emerald-600" />
                                <span className="truncate">{w.email}</span>
                              </p>
                            </div>
                          </div>

                          {/* Otros establecimientos del peón */}
                          {w.farmIds.length > 1 && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold">También en: </span>
                              {w.farmIds
                                .filter((id) => id !== farm.id)
                                .map((id) => {
                                  const other = farms.data?.items.find((f) => f.id === id)
                                  return other?.name ?? `Establecimiento ${id}`
                                })
                                .join(', ')}
                            </div>
                          )}

                          <button
                            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-input bg-background hover:bg-muted px-3 py-2 text-xs font-semibold shadow-xs transition-colors focus-visible:outline-3 focus-visible:outline-[#d3a865]"
                            onClick={() => {
                              setEditing(w)
                              setSelected(w.farmIds)
                              setError(null)
                            }}
                          >
                            <Edit3 size={14} />
                            <span>Editar asignaciones</span>
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {query.data?.total === 0 && farmEntries.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          No hay peones ni establecimientos registrados.
        </div>
      )}

      <Pagination query={query} page={page} setPage={setPage} />

      {/* Modal/Formulario de edición de asignaciones */}
      {editing && (
        <form
          className="space-y-4 rounded-2xl border border-emerald-500/30 bg-card p-5 sm:p-6 shadow-lg"
          onSubmit={(e) => {
            e.preventDefault()
            setConfirm(true)
          }}
        >
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Asignaciones de {editing.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              Seleccioná los campos a los que este peón tendrá acceso.
            </p>
          </div>

          <FarmChoices
            farms={farms.data?.items ?? []}
            selected={selected}
            onChange={setSelected}
            label="Establecimientos asignados"
          />

          {error && (
            <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {error.message}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5 pt-2">
            <button className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 text-sm font-bold shadow-xs transition-colors focus-visible:outline-3 focus-visible:outline-[#d3a865]">
              <Check size={16} />
              <span>Guardar asignaciones</span>
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-input bg-background hover:bg-muted px-4 py-2 text-sm font-semibold shadow-xs transition-colors focus-visible:outline-3 focus-visible:outline-[#d3a865]"
              onClick={() => setEditing(null)}
            >
              <X size={16} />
              <span>Cancelar</span>
            </button>
          </div>
        </form>
      )}

      <ConfirmAction
        open={confirm}
        title="Cambiar asignaciones"
        description="Al retirar establecimientos el peón pierde acceso de inmediato y sus tareas abiertas quedan sin responsable, conservando su estado."
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await api.request(`/team/${editing.id}/assignments`, {
              method: 'PUT',
              body: { farmIds: selected },
            })
            setConfirm(false)
            setEditing(null)
            await refresh()
          } catch (err) {
            setError(err)
            throw err
          }
        }}
      />

      {farms.error ? (
        <p role="alert" className="text-xs text-rose-600">{farms.error.message}</p>
      ) : (
        <Invitations farms={farms.data?.items ?? []} onChange={refresh} />
      )}
    </ResourceLayout>
  )
}
