import { ResourceHistory } from '../Historial/Historial.jsx'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth.js'
import { useFarmScope } from '../../hooks/useFarmScope.js'
import { useTroughs } from '../../hooks/useTroughs.js'
import { api } from '../../services/api.js'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import ConfirmAction from '../../components/ConfirmAction.jsx'
import { Freshness } from '../../components/TelemetryDetails.jsx'
import Pagination from '../../components/Pagination.jsx'
import TroughForm from './TroughForm.jsx'
export default function Bebederos() {
  const scope = useFarmScope()
  const [page, setPage] = useState(1)
  const [historyId, setHistoryId] = useState(null)
  const [params] = useSearchParams()
  const selected = params.get('id')
  const query = useTroughs(scope.farmId, page, selected)
  const { account } = useAuth()
  const client = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(null)
  async function refresh() {
    await client.invalidateQueries({ queryKey: ['account', account.id] })
  }
  return (
    <ResourceLayout title="Bebederos" scope={scope} query={query}>
      {scope.invalidScope ? (
        <p>No tenés acceso al establecimiento seleccionado.</p>
      ) : (
        <>
          {account.role === 'owner' &&
            (scope.farmId ? (
              <button
                className="min-h-11 rounded-lg bg-[#198754] px-4 text-white"
                onClick={() => setAdding(true)}
              >
                Nuevo bebedero
              </button>
            ) : (
              <p>Seleccioná un establecimiento para crear un bebedero.</p>
            ))}
          {adding && scope.farmId && (
            <TroughForm
              onCancel={() => setAdding(false)}
              onSave={async (body) => {
                await api.request(`/farms/${scope.farmId}/troughs`, { method: 'POST', body })
                setAdding(false)
                await refresh()
              }}
            />
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {(selected ? (query.data ? [query.data] : []) : query.data?.items)?.map((t) => (
              <article key={t.id} className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{t.name}</h2>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    #{t.id}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Capacidad: <span className="font-medium text-foreground">{t.capacityLiters} litros</span> · {t.operationalState}
                </p>
                <div className="rounded-xl bg-muted/40 p-3.5 space-y-2">
                  <p className="text-base font-bold text-foreground">
                    Agua:{' '}
                    {t.waterLevel === null ? 'Sin medición' : `${t.waterLevel}% · ${t.waterCategory}`}
                  </p>
                  {t.waterLevel !== null && (
                    <div
                      className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={t.waterLevel}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          t.waterLevel > 50
                            ? 'bg-emerald-600'
                            : t.waterLevel >= 20
                              ? 'bg-amber-500'
                              : 'bg-rose-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, t.waterLevel))}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <Freshness value={t.freshness} date={t.lastUpdatedAt} />
                  <p>
                    Ubicación:{' '}
                    {t.latitude === null ? 'Sin ubicación' : `${t.latitude}, ${t.longitude}`} ·{' '}
                    {t.locationSource === 'device' ? 'GPS de dispositivo' : 'Administrativa'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
                  <button className="min-h-11 rounded-lg px-3 text-sm font-medium text-primary hover:bg-muted focus-visible:outline-3 focus-visible:outline-[#d3a865]" onClick={()=>setHistoryId(historyId===t.id?null:t.id)}>
                    {historyId===t.id?'Ocultar antecedentes':'Ver antecedentes'}
                  </button>
                  {account.role === 'owner' && (
                    <button className="min-h-11 rounded-lg px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 focus-visible:outline-3 focus-visible:outline-[#d3a865]" onClick={() => setRemoving(t)}>
                      Eliminar
                    </button>
                  )}
                </div>
                {historyId===t.id&&<ResourceHistory resourceType="troughs" resource={t}/>}
              </article>
            ))}
          </div>
          {query.data?.total === 0 && <p>No hay bebederos disponibles.</p>}
          {!selected && <Pagination query={query} page={page} setPage={setPage} />}
        </>
      )}
      <ConfirmAction
        open={!!removing}
        title="Eliminar bebedero"
        description="No puede tener tareas abiertas. Se conservarán sus lecturas y antecedentes."
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          await api.request(`/troughs/${removing.id}`, { method: 'DELETE' })
          setRemoving(null)
          await refresh()
        }}
      />
    </ResourceLayout>
  )
}
