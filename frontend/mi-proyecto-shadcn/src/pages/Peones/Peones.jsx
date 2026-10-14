import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
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
  const query = useLiveQuery(
      'team',
      account.role === 'owner' ? `/team?page=${page}` : null,
    ),
    farms = useLiveQuery('farms', '/farms?limit=100')
  if (account.role !== 'owner') return <Navigate to="/dashboard" replace />
  async function refresh() {
    await client.invalidateQueries({ queryKey: ['account', account.id] })
  }
  return (
    <ResourceLayout title="Equipo" query={query}>
      <p>
        Administrá los establecimientos de cada peón. Sus accesos de otros
        dueños se conservan.
      </p>
      {query.data?.items.map((w) => (
        <article className="space-y-2 rounded-xl border bg-card p-4" key={w.id}>
          <h2 className="text-xl font-semibold">{w.name}</h2>
          <p className="break-all">{w.email}</p>
          <p>
            {w.farmIds
              .map(
                (id) =>
                  farms.data?.items.find((f) => f.id === id)?.name ??
                  `Establecimiento ${id}`,
              )
              .join(', ') || 'Sin establecimientos asignados'}
          </p>
          <button
            className="min-h-11 px-3"
            onClick={() => {
              setEditing(w)
              setSelected(w.farmIds)
              setError(null)
            }}
          >
            Editar asignaciones
          </button>
        </article>
      ))}
      {query.data?.total === 0 && <p>No hay peones asociados.</p>}
      <Pagination query={query} page={page} setPage={setPage} />
      {editing && (
        <form
          className="space-y-3 rounded-xl border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault()
            setConfirm(true)
          }}
        >
          <h2 className="font-semibold">Asignaciones de {editing.name}</h2>
          <FarmChoices
            farms={farms.data?.items ?? []}
            selected={selected}
            onChange={setSelected}
            label="Establecimientos asignados"
          />
          {error && <p role="alert">{error.message}</p>}
          <button className="min-h-11 rounded-lg bg-[#198754] px-4 text-white">
            Guardar asignaciones
          </button>
          <button
            type="button"
            className="min-h-11 px-3"
            onClick={() => setEditing(null)}
          >
            Cancelar
          </button>
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
        <p role="alert">{farms.error.message}</p>
      ) : (
        <Invitations farms={farms.data?.items ?? []} onChange={refresh} />
      )}
    </ResourceLayout>
  )
}
