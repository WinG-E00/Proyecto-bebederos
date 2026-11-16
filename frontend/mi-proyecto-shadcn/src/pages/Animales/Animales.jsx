import { ResourceHistory } from '../Historial/Historial.jsx'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth.js'
import { useFarmScope } from '../../hooks/useFarmScope.js'
import { useAnimals } from '../../hooks/useAnimals.js'
import { api } from '../../services/api.js'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import ConfirmAction from '../../components/ConfirmAction.jsx'
import AdministrativeForm from '../../components/AdministrativeForm.jsx'
import { Freshness } from '../../components/TelemetryDetails.jsx'
import { formatDate } from '../../lib/dates.js'
import Pagination from '../../components/Pagination.jsx'
import { Droplets, History, MapPin, Pencil, Trash2 } from 'lucide-react'
const fields = [
  ['name', 'Identificación individual', 'text'],
  ['species', 'Especie', 'text'],
  ['breed', 'Raza', 'text'],
  ['ageYears', 'Edad (años)', 'number', 0],
  ['state', 'Estado administrativo', 'text'],
]
export default function Animales() {
  const scope = useFarmScope()
  const [page, setPage] = useState(1)
  const [historyId, setHistoryId] = useState(null)
  const [params] = useSearchParams()
  const selected = params.get('id')
  const query = useAnimals(scope.farmId, page, selected)
  const { account } = useAuth()
  const client = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  async function refresh() {
    await client.invalidateQueries({ queryKey: ['account', account.id] })
  }
  const items = selected ? (query.data ? [query.data] : []) : query.data?.items
  return (
    <ResourceLayout title="Animales" scope={scope} query={query}>
      {scope.invalidScope ? (
        <p>No tenés acceso al establecimiento seleccionado.</p>
      ) : (
        <>
          {account.role === 'owner' &&
            (scope.farmId ? (
              <button
                className="min-h-11 rounded-lg bg-[#198754] px-4 text-white"
                onClick={() => setEditing({})}
              >
                Nuevo animal
              </button>
            ) : (
              <p>Seleccioná un establecimiento para crear un animal.</p>
            ))}
          {editing && (
            <AdministrativeForm
              key={editing.id ?? 'new'}
              fields={fields}
              initial={editing}
              label="Guardar animal"
              onCancel={() => setEditing(null)}
              onSave={async (body) => {
                await api.request(
                  editing.id ? `/animals/${editing.id}` : `/farms/${scope.farmId}/animals`,
                  { method: editing.id ? 'PATCH' : 'POST', body },
                )
                setEditing(null)
                await refresh()
              }}
            />
          )}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items?.map((a) => (
              <article key={a.id} className="flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-bold tracking-tight text-foreground">{a.name}</h2>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">#{a.id}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    a.state?.toLocaleLowerCase('es-AR') === 'activo'
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {a.state}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">
                  {a.species} · {a.breed} · {a.ageYears} años
                </p>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-foreground">
                    <MapPin size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="font-medium">GPS:</span>{' '}
                    <span className="min-w-0 break-all text-muted-foreground">
                      {a.position
                        ? `${a.position.latitude}, ${a.position.longitude}`
                        : 'Sin ubicación recibida'}
                    </span>
                  </p>
                  <div className="pl-6 text-xs text-muted-foreground">
                    <Freshness value={a.freshness} date={a.position?.measuredAt} />
                  </div>
                </div>
                <div className="space-y-2 border-t border-border/70 pt-3 text-sm">
                  <h3 className="flex items-center gap-2 font-semibold text-foreground">
                    <Droplets size={16} className="shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    Última visita al bebedero
                  </h3>
                  {a.lastVisit ? (
                    <p className="pl-6 leading-relaxed text-muted-foreground">
                      <span className="font-semibold">{a.lastVisit.troughName}</span> · {formatDate(a.lastVisit.visitedAt)} · Visita estimada
                      por proximidad; no acredita consumo.
                    </p>
                  ) : (
                    <p className="pl-6 text-sm text-muted-foreground">Sin visitas registradas</p>
                  )}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
                  <button className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-primary transition-colors hover:bg-muted focus-visible:outline-3 focus-visible:outline-[#d3a865]" onClick={()=>setHistoryId(historyId===a.id?null:a.id)}>
                    <History size={16} aria-hidden="true" />
                    {historyId===a.id?'Ocultar antecedentes':'Ver antecedentes'}
                  </button>
                  {account.role === 'owner' && (
                    <div className="flex gap-2">
                      <button className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-3 focus-visible:outline-[#d3a865]" onClick={() => setEditing(a)}>
                        <Pencil size={16} aria-hidden="true" />
                        Editar
                      </button>
                      <button className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-3 focus-visible:outline-[#d3a865] dark:text-rose-300 dark:hover:bg-rose-950/40" onClick={() => setRemoving(a)}>
                        <Trash2 size={16} aria-hidden="true" />
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
                {historyId===a.id&&<ResourceHistory resourceType="animals" resource={a}/>}
              </article>
            ))}
          </div>
          {query.data?.total === 0 && (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              No hay animales disponibles.
            </p>
          )}
          {!selected && <Pagination query={query} page={page} setPage={setPage} />}
        </>
      )}
      <ConfirmAction
        open={!!removing}
        title="Eliminar animal"
        description="Se conservarán sus posiciones y visitas estimadas."
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          await api.request(`/animals/${removing.id}`, { method: 'DELETE' })
          setRemoving(null)
          await refresh()
        }}
      />
    </ResourceLayout>
  )
}
