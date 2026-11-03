import { useState } from 'react'
import { Check, Clock, Mail, MailPlus, RefreshCw, Trash2, UserPlus } from 'lucide-react'
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
    <section className="space-y-5 pt-8 border-t border-border">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <MailPlus size={20} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Invitaciones</h2>
          <p className="text-xs text-muted-foreground">Invitá a nuevos peones por correo electrónico a tus establecimientos</p>
        </div>
      </div>

      <form
        className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs"
        onSubmit={send}
      >
        <label className="grid gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Correo del peón
          </span>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="min-h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 py-2 text-sm shadow-xs transition hover:border-emerald-600 focus-visible:outline-3 focus-visible:outline-[#d3a865]"
              type="email"
              required
              maxLength={254}
              placeholder="peon@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </label>

        <FarmChoices
          farms={farms}
          selected={farmIds}
          onChange={setFarmIds}
          label="Establecimientos de la invitación"
        />

        <div className="pt-2">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 text-sm font-bold shadow-xs transition-colors focus-visible:outline-3 focus-visible:outline-[#d3a865] disabled:opacity-50"
            disabled={pending || !farmIds.length}
          >
            <UserPlus size={16} />
            <span>Enviar invitación</span>
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          El peón recibe acceso cuando acepta. El enlace vence en siete días.
        </p>
      </form>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {error.message}
        </p>
      )}

      <AsyncState
        loading={query.isPending}
        error={query.error}
        onRetry={() => query.refetch()}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {!query.denied &&
          query.data?.items.map((i) => (
            <article
              className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:shadow-md"
              key={i.id}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="break-all font-bold text-base text-foreground leading-snug">{i.email}</h3>
                <span className="inline-flex items-center rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                  {i.state}
                </span>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Estado de envío: <strong>{i.deliveryState}</strong>
                </p>
                <p className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>Vence: {formatDate(i.expiresAt)}</span>
                </p>
                <div className="pt-1 flex flex-wrap gap-1">
                  {i.farmIds
                    .map(
                      (id) =>
                        farms.find((f) => f.id === id)?.name ??
                        `Establecimiento ${id}`,
                    )
                    .map((fname, idx) => (
                      <span key={idx} className="inline-block rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
                        {fname}
                      </span>
                    )) || 'Sin establecimientos vigentes'}
                </div>
              </div>

              {i.state === 'Pendiente' && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {i.deliveryState === 'Fallido' && (
                    <button
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-input bg-background hover:bg-muted px-3 py-1.5 text-xs font-semibold shadow-xs transition focus-visible:outline-3 focus-visible:outline-[#d3a865] disabled:opacity-50"
                      disabled={pending}
                      onClick={() => retry(i.id)}
                    >
                      <RefreshCw size={13} />
                      <span>Reintentar envío</span>
                    </button>
                  )}
                  <button
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100/60 px-3 py-1.5 text-xs font-semibold shadow-xs transition focus-visible:outline-3 focus-visible:outline-[#d3a865] disabled:opacity-50"
                    disabled={pending}
                    onClick={() => setRemoving(i)}
                  >
                    <Trash2 size={13} />
                    <span>Retirar invitación</span>
                  </button>
                </div>
              )}
            </article>
          ))}
      </div>

      {query.data?.total === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-xs text-muted-foreground">
          No hay invitaciones enviadas pendientes.
        </div>
      )}

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
    <fieldset className="min-w-0 space-y-2 rounded-xl bg-muted/40 p-3.5 border border-border/60">
      <legend className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {farms.map((f) => {
          const isChecked = selected.includes(f.id)
          return (
            <label
              className={`flex min-h-11 items-center gap-3 rounded-xl border p-2.5 text-xs sm:text-sm font-medium transition cursor-pointer ${
                isChecked
                  ? 'border-emerald-600 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-semibold shadow-xs'
                  : 'border-border bg-background hover:bg-muted text-foreground'
              }`}
              key={f.id}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                checked={isChecked}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, f.id]
                      : selected.filter((id) => id !== f.id),
                  )
                }
              />
              <span>{f.name}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
