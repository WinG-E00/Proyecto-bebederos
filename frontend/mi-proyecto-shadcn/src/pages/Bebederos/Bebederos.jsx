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
              <article key={t.id} className="space-y-2 rounded-xl border bg-card p-4">
                <h2 className="text-xl font-semibold">{t.name}</h2>
                <p>
                  Capacidad: {t.capacityLiters} litros · {t.operationalState}
                </p>
                <p className="text-lg font-bold">
                  Agua:{' '}
                  {t.waterLevel === null ? 'Sin medición' : `${t.waterLevel}% · ${t.waterCategory}`}
                </p>
                <Freshness value={t.freshness} date={t.lastUpdatedAt} />
                <p>
                  Ubicación:{' '}
                  {t.latitude === null ? 'Sin ubicación' : `${t.latitude}, ${t.longitude}`} ·{' '}
                  {t.locationSource === 'device' ? 'GPS de dispositivo' : 'Administrativa'}
                </p>
                <button className="min-h-11 px-3 underline" onClick={()=>setHistoryId(historyId===t.id?null:t.id)}>{historyId===t.id?'Ocultar antecedentes':'Ver antecedentes'}</button>
                {historyId===t.id&&<ResourceHistory resourceType="troughs" resource={t}/>}
                {account.role === 'owner' && (
                  <button className="min-h-11 px-3" onClick={() => setRemoving(t)}>
                    Eliminar
                  </button>
                )}
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
