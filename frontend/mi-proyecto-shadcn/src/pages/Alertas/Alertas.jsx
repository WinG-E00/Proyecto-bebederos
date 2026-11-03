import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, AlertTriangle, ArrowRight, Bell, Check, CheckCircle2, Clock, Droplets, MapPin } from 'lucide-react'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import Pagination from '../../components/Pagination.jsx'
import AsyncState from '../../components/AsyncState.jsx'
import { useFarmScope } from '../../hooks/useFarmScope.js'
import { useAlerts, useNotifications, useReadNotification } from '../../hooks/useAlerts.js'
import { formatDate } from '../../lib/dates.js'

export default function Alertas() {
  const scope = useFarmScope(),
    [active, setActive] = useState(true),
    [page, setPage] = useState(1),
    [messagePage, setMessagePage] = useState(1)
  const alerts = useAlerts(scope.farmId, active, page),
    messages = useNotifications(scope.farmId, messagePage),
    read = useReadNotification()

  return (
    <ResourceLayout title="Alertas y notificaciones" scope={scope} query={alerts}>
      {/* Selector de estado de alertas */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Monitoreo de alertas</h2>
            <p className="text-xs text-muted-foreground">Alertas generadas por niveles de agua y anomalías</p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span>Estado:</span>
          <select
            className="min-h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm font-semibold shadow-xs transition hover:border-emerald-600 focus-visible:outline-3 focus-visible:outline-[#d3a865]"
            value={String(active)}
            onChange={(e) => {
              setActive(e.target.value === 'true')
              setPage(1)
            }}
          >
            <option value="true">Activas</option>
            <option value="false">Resueltas</option>
          </select>
        </label>
      </div>

      {/* Lista de alertas */}
      {alerts.data?.total === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center space-y-2">
          <CheckCircle2 size={36} className="mx-auto text-emerald-500/80" />
          <p className="font-semibold text-foreground">No hay alertas {active ? 'activas' : 'resueltas'}.</p>
          <p className="text-sm text-muted-foreground">
            {active ? 'Todos los bebederos y animales se encuentran dentro de los parámetros normales.' : 'No se registran alertas resueltas recientemente.'}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {alerts.data?.items.map((a) => {
          const isResolved = Boolean(a.resolvedAt)
          return (
            <article
              key={a.id}
              className={`space-y-3.5 rounded-2xl border bg-card p-5 shadow-xs transition hover:shadow-md ${
                isResolved
                  ? 'border-border border-l-4 border-l-emerald-600'
                  : 'border-rose-200 dark:border-rose-950/60 border-l-4 border-l-rose-600'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                    isResolved
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 animate-pulse'
                  }`}
                >
                  {isResolved ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                  {isResolved ? 'Resuelta' : 'Activa'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
                  <Clock size={13} />
                  {formatDate(a.generatedAt)}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground leading-snug">
                {a.message}
              </h2>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 font-medium">
                  <Droplets size={13} className="text-emerald-600" />
                  {a.resourceType === 'trough' ? 'Bebedero' : 'Animal'} #{a.resourceId}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 font-medium">
                  <MapPin size={13} className="text-emerald-600" />
                  Campo #{a.farmId}
                </span>
                {a.resolvedAt && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    Resolución: {formatDate(a.resolvedAt)}
                  </span>
                )}
              </div>

              <div className="pt-1">
                <Link
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs sm:text-sm font-semibold shadow-xs transition-colors focus-visible:outline-3 focus-visible:outline-[#d3a865]"
                  to={`/${a.resourceType === 'trough' ? 'troughs' : 'animals'}?farmId=${a.farmId}&id=${a.resourceId}`}
                >
                  <span>Ver recurso</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </article>
          )
        })}
      </div>

      <Pagination query={alerts} page={page} setPage={setPage} />

      {/* Sección Notificaciones de tareas */}
      <div className="pt-6 border-t border-border space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Bell size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Notificaciones de tareas</h2>
            <p className="text-xs text-muted-foreground">Avisos de asignaciones, avances y aprobaciones</p>
          </div>
        </div>

        <AsyncState loading={messages.isPending} error={messages.error || read.error} onRetry={() => messages.refetch()} />
        {messages.stale && <p role="status" className="text-xs text-amber-600">Sin conexión. Mensajes anteriores.</p>}

        {messages.data?.total === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
            No hay notificaciones disponibles.
          </div>
        )}

        <div className="space-y-3">
          {messages.data?.items.map((m) => (
            <article
              key={m.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 shadow-xs transition ${
                m.readAt
                  ? 'border-border bg-card/60 text-muted-foreground'
                  : 'border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 text-foreground'
              }`}
            >
              <div className="space-y-1 max-w-2xl">
                <p className="text-sm sm:text-base font-semibold leading-snug">{m.message}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock size={12} />
                  <span>{formatDate(m.occurredAt)}</span>
                  <span>·</span>
                  <span className={`font-semibold ${m.readAt ? 'text-muted-foreground' : 'text-blue-600 dark:text-blue-400'}`}>
                    {m.readAt ? 'Leída' : 'Sin leer'}
                  </span>
                </div>
              </div>

              {!m.readAt && (
                <button
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white dark:bg-card hover:bg-blue-50 border border-blue-300 dark:border-blue-800 px-4 py-2 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 shadow-xs transition disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-[#d3a865]"
                  disabled={read.isPending}
                  onClick={() => read.mutate(m.id)}
                >
                  <Check size={15} />
                  <span>Marcar como leída</span>
                </button>
              )}
            </article>
          ))}
        </div>

        <Pagination query={messages} page={messagePage} setPage={setMessagePage} />
      </div>
    </ResourceLayout>
  )
}
