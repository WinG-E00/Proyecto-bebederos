import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth.js'
import { useFarmScope } from '../../hooks/useFarmScope.js'
import { api } from '../../services/api.js'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import ConfirmAction from '../../components/ConfirmAction.jsx'
import FarmForm from './FarmForm.jsx'
export default function Establecimientos() {
  const scope = useFarmScope()
  const query = scope.farms
  const { account } = useAuth()
  const client = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  async function save(body) {
    await api.request(editing.id ? `/farms/${editing.id}` : '/farms', {
      method: editing.id ? 'PATCH' : 'POST',
      body,
    })
    setEditing(null)
    await client.invalidateQueries({ queryKey: ['account', account.id] })
  }
  return (
    <ResourceLayout title="Establecimientos" scope={scope} query={query}>
      {account.role === 'owner' && (
        <button
          className="min-h-11 rounded-lg bg-[#198754] px-4 text-white"
          onClick={() => setEditing({})}
        >
          Nuevo establecimiento
        </button>
      )}
      {editing && (
        <FarmForm
          key={editing.id ?? 'new'}
          initial={editing.id ? editing : undefined}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {query.data?.items
          .filter((f) => !scope.farmId || String(f.id) === scope.farmId)
          .map((f) => (
            <article key={f.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
              <h2 className="text-xl font-semibold">{f.name}</h2>
              <p>{f.description}</p>
              <p>
                {f.areaHa} ha · {f.animalCount} animales · {f.troughCount} bebederos
              </p>
              <p>
                Ubicación: {f.latitude}, {f.longitude}
              </p>
              <p>
                Antigüedad máxima: {f.staleMinutes} minutos · {f.timezone}
              </p>
              {account.role === 'owner' && (
                <div className="flex gap-3">
                  <button className="min-h-11 px-3" onClick={() => setEditing(f)}>
                    Editar
                  </button>
                  <button className="min-h-11 px-3" onClick={() => setRemoving(f)}>
                    Eliminar
                  </button>
                </div>
              )}
            </article>
          ))}
      </div>
      {query.data?.total === 0 && <p>No hay establecimientos disponibles.</p>}
      <ConfirmAction
        open={!!removing}
        title="Eliminar establecimiento"
        description="Solo se puede retirar un campo sin animales, bebederos activos ni tareas abiertas. Se retirarán los accesos e invitaciones de este campo; sus antecedentes se conservarán."
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          await api.request(`/farms/${removing.id}`, { method: 'DELETE' })
          setRemoving(null)
          await client.invalidateQueries({ queryKey: ['account', account.id] })
        }}
      />
    </ResourceLayout>
  )
}
