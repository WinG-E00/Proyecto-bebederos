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
          <div className="grid gap-4 md:grid-cols-2">
            {items?.map((a) => (
              <article key={a.id} className="space-y-2 rounded-xl border bg-card p-4">
                <h2 className="text-xl font-semibold">{a.name}</h2>
                <p>
                  {a.species} · {a.breed} · {a.ageYears} años · {a.state}
                </p>
                <p>
                  GPS:{' '}
                  {a.position
                    ? `${a.position.latitude}, ${a.position.longitude}`
                    : 'Sin ubicación recibida'}
                </p>
                <Freshness value={a.freshness} date={a.position?.measuredAt} />
                <h3 className="font-semibold">Última visita al bebedero</h3>
                {a.lastVisit ? (
                  <p>
                    {a.lastVisit.troughName} · {formatDate(a.lastVisit.visitedAt)} · Visita estimada
                    por proximidad; no acredita consumo.
                  </p>
                ) : (
                  <p>Sin visitas registradas</p>
                )}
                <button className="min-h-11 px-3 underline" onClick={()=>setHistoryId(historyId===a.id?null:a.id)}>{historyId===a.id?'Ocultar antecedentes':'Ver antecedentes'}</button>
                {historyId===a.id&&<ResourceHistory resourceType="animals" resource={a}/>}
                {account.role === 'owner' && (
                  <div className="flex gap-3">
                    <button className="min-h-11 px-3" onClick={() => setEditing(a)}>
                      Editar
                    </button>
                    <button className="min-h-11 px-3" onClick={() => setRemoving(a)}>
                      Eliminar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
          {query.data?.total === 0 && <p>No hay animales disponibles.</p>}
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
