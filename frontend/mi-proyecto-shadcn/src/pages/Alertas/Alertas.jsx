import { useState } from 'react'
import { Link } from 'react-router-dom'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import Pagination from '../../components/Pagination.jsx'
import AsyncState from '../../components/AsyncState.jsx'
import { useFarmScope } from '../../hooks/useFarmScope.js'
import { useAlerts, useNotifications, useReadNotification } from '../../hooks/useAlerts.js'
import { formatDate } from '../../lib/dates.js'
export default function Alertas() {
 const scope=useFarmScope(), [active,setActive]=useState(true), [page,setPage]=useState(1), [messagePage,setMessagePage]=useState(1)
 const alerts=useAlerts(scope.farmId,active,page), messages=useNotifications(scope.farmId,messagePage), read=useReadNotification()
 return <ResourceLayout title="Alertas y notificaciones" scope={scope} query={alerts}>
  <label className="block">Estado de alertas <select className="min-h-11 rounded border p-2" value={String(active)} onChange={e=>{setActive(e.target.value==='true');setPage(1)}}><option value="true">Activas</option><option value="false">Resueltas</option></select></label>
  {alerts.data?.total===0&&<p>No hay alertas {active?'activas':'resueltas'}.</p>}
  <div className="grid gap-3 sm:grid-cols-2">{alerts.data?.items.map(a=><article key={a.id} className="rounded-xl border p-4 space-y-2"><h2 className="font-bold">{a.message}</h2><p>{a.resourceType==='trough'?'Bebedero':'Animal'} #{a.resourceId} · Campo #{a.farmId}</p><p>{a.resolvedAt?'Resuelta':'Activa'} · {formatDate(a.generatedAt)}</p>{a.resolvedAt&&<p>Resolución: {formatDate(a.resolvedAt)}</p>}<Link className="inline-flex min-h-11 items-center underline" to={`/${a.resourceType==='trough'?'troughs':'animals'}?farmId=${a.farmId}&id=${a.resourceId}`}>Ver recurso</Link></article>)}</div>
  <Pagination query={alerts} page={page} setPage={setPage}/>
  <h2 className="text-xl font-bold">Notificaciones de tareas</h2>
  <AsyncState loading={messages.isPending} error={messages.error||read.error} onRetry={()=>messages.refetch()}/>
  {messages.stale&&<p role="status">Sin conexión. Mensajes anteriores.</p>}
  {messages.data?.total===0&&<p>No hay notificaciones.</p>}
  {messages.data?.items.map(m=><article key={m.id} className="rounded-xl border p-4"><p>{m.message}</p><p>{formatDate(m.occurredAt)} · {m.readAt?'Leída':'Sin leer'}</p>{!m.readAt&&<button className="min-h-11 rounded border px-3" disabled={read.isPending} onClick={()=>read.mutate(m.id)}>Marcar como leída</button>}</article>)}
  <Pagination query={messages} page={messagePage} setPage={setMessagePage}/>
 </ResourceLayout>
}
