import { useState } from 'react'
import { useLiveQuery } from '../../hooks/useLiveQuery.js'
import ConfirmAction from '../../components/ConfirmAction.jsx'
import { api } from '../../services/api.js'
import { formatDate } from '../../lib/dates.js'
import Pagination from '../../components/Pagination.jsx'
import AsyncState from '../../components/AsyncState.jsx'
export default function Invitations({ farms, onChange }) {
  const [page, setPage] = useState(1)
  const query = useLiveQuery('invitations', `/invitations?page=${page}`)
  const [email, setEmail] = useState(''),
    [farmIds, setFarmIds] = useState([]),
    [pending, setPending] = useState(false),
    [error, setError] = useState(null),
    [removing, setRemoving] = useState(null)
  async function send(e) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await api.request('/invitations', {
        method: 'POST',
        body: { email, farmIds },
      })
      setEmail('')
      setFarmIds([])
      await onChange()
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }
  async function retry(id) {
    setPending(true)
    setError(null)
    try {
      await api.request(`/invitations/${id}/retry`, {
        method: 'POST',
        body: {},
      })
      await onChange()
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Invitaciones</h2>
      <form
        className="grid gap-3 rounded-xl border bg-card p-4"
        onSubmit={send}
      >
        <label className="grid gap-1">
          Correo del peón
          <input
            className="min-h-11 min-w-0 rounded-lg border bg-background p-2"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <FarmChoices
          farms={farms}
          selected={farmIds}
          onChange={setFarmIds}
          label="Establecimientos de la invitación"
        />
        <button
          className="min-h-11 rounded-lg bg-[#198754] px-4 text-white"
          disabled={pending || !farmIds.length}
        >
          Enviar invitación
        </button>
        <p>
          El peón recibe acceso cuando acepta. El enlace vence en siete días.
        </p>
      </form>
      {error && <p role="alert">{error.message}</p>}
      <AsyncState
        loading={query.isPending}
        error={query.error}
        onRetry={() => query.refetch()}
      />
      {!query.denied &&
        query.data?.items.map((i) => (
          <article
            className="space-y-2 rounded-xl border bg-card p-4"
            key={i.id}
          >
            <h3 className="break-all font-semibold">{i.email}</h3>
            <p>
              Invitación: {i.state} · Envío: {i.deliveryState}
            </p>
            <p>Vence: {formatDate(i.expiresAt)}</p>
            <p>
              {i.farmIds
                .map(
                  (id) =>
                    farms.find((f) => f.id === id)?.name ??
                    `Establecimiento ${id}`,
                )
                .join(', ') || 'Sin establecimientos vigentes'}
            </p>
            {i.state === 'Pendiente' && (
              <div className="flex flex-wrap gap-2">
                {i.deliveryState === 'Fallido' && (
                  <button
                    className="min-h-11 px-3"
                    disabled={pending}
                    onClick={() => retry(i.id)}
                  >
                    Reintentar envío
                  </button>
                )}
                <button
                  className="min-h-11 px-3"
                  disabled={pending}
                  onClick={() => setRemoving(i)}
                >
                  Retirar invitación
                </button>
              </div>
            )}
          </article>
        ))}
      {query.data?.total === 0 && <p>No hay invitaciones.</p>}
      <Pagination query={query} page={page} setPage={setPage} />
      <ConfirmAction
        open={!!removing}
        title="Retirar invitación"
        description="El enlace dejará de permitir la aceptación. Los accesos ya aceptados se administran en Equipo."
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          await api.request(`/invitations/${removing.id}`, { method: 'DELETE' })
          setRemoving(null)
          await onChange()
        }}
      />
    </section>
  )
}
export function FarmChoices({ farms, selected, onChange, label }) {
  return (
    <fieldset className="min-w-0">
      <legend className="font-medium">{label}</legend>
      {farms.map((f) => (
        <label className="flex min-h-11 items-center gap-3" key={f.id}>
          <input
            type="checkbox"
            checked={selected.includes(f.id)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...selected, f.id]
                  : selected.filter((id) => id !== f.id),
              )
            }
          />
          {f.name}
        </label>
      ))}
    </fieldset>
  )
}
