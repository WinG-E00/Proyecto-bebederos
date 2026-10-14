import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import Pagination from '../../components/Pagination.jsx'
import AsyncState from '../../components/AsyncState.jsx'
import { useHistory } from '../../hooks/useHistory.js'
import { useLiveQuery } from '../../hooks/useLiveQuery.js'
import { formatDate } from '../../lib/dates.js'
const labels={water:'Agua',gps:'Posiciones GPS',visit:'Visitas estimadas',alert:'Alertas',task:'Tareas',retirement:'Bajas administrativas'}
const resources={trough:'Bebedero',animal:'Animal',task:'Tarea',farm:'Establecimiento'}
function EventDetails({event}) {
 const d=event.details
 if(event.type==='water')return <p>Agua: {d.percentage}% · {d.category}</p>
 if(event.type==='gps')return <p>Posición: {d.latitude}, {d.longitude}</p>
 if(event.type==='visit')return <p>Visita estimada al bebedero #{d.troughId}. No acredita consumo.</p>
 if(event.type==='alert')return <p>{d.resolved?'Resuelta':'Generada'} · {{water_low:'Agua Baja',water_critical:'Agua Crítica',water_stale:'Agua desactualizada',water_missing:'Sin datos de agua',gps_stale:'GPS desactualizado',gps_missing:'Sin datos de GPS'}[d.conditionName]??'Alerta'}{d.reason==='retirement'?' · Recurso retirado':''}</p>
 if(event.type==='task')return <><p>{d.previousState?`${d.previousState} → `:''}{d.newState}</p><p>Responsable anterior: {d.previousWorkerId?`#${d.previousWorkerId}`:'Sin asignar'} · Nuevo: {d.newWorkerId?`#${d.newWorkerId}`:'Sin asignar'}</p>{d.comment&&<p>Comentario: {d.comment}</p>}</>
 return <p>Recurso retirado; antecedentes conservados.</p>
}
function HistoryList({query,page,setPage}) {
 return <>
  {query.data?.total===0&&<p>No hay antecedentes para estos filtros.</p>}
  <ol className="space-y-3">{query.data?.items.map(e=><li key={e.id} className="rounded-xl border p-4 space-y-2"><h2 className="font-bold">{labels[e.type]} · {resources[e.resourceType]} {e.resourceName??`#${e.resourceId}`}</h2><p>{e.farmName} · {formatDate(e.occurredAt,e.timezone)}</p>{e.actorId&&<p>Acción realizada por {e.actorName??`#${e.actorId}`}</p>}<EventDetails event={e}/></li>)}</ol>
  <Pagination query={query} page={page} setPage={setPage}/>
 </>
}
export function ResourceHistory({resourceType,resource}) {
 const [page,setPage]=useState(1)
 const query=useHistory({farmId:String(resource.farmId),resourceType,resourceId:resource.id,page})
 return <section className="space-y-3"><h3 className="font-bold">Antecedentes de {resource.name}</h3><AsyncState loading={query.isPending} error={query.error} onRetry={()=>query.refetch()}/>{query.stale&&<p>Sin conexión. Antecedentes anteriores.</p>}<HistoryList query={query} page={page} setPage={setPage}/></section>
}
export default function Historial() {
 const [params,setParams]=useSearchParams(),[type,setType]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[page,setPage]=useState(1)
 const farms=useLiveQuery('history-farms','/farms?includeRetired=true&limit=100')
 const query=useHistory({farmId:params.get('farmId')||'',type,from:from?new Date(from).toISOString():'',to:to?new Date(to).toISOString():'',page})
 return <ResourceLayout title="Historial" query={query}>
  <AsyncState loading={farms.isPending} error={farms.error} onRetry={()=>farms.refetch()}/>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
   <label>Establecimiento<select className="block w-full min-h-11 rounded border p-2" value={params.get('farmId')||''} onChange={e=>{setParams(e.target.value?{farmId:e.target.value}:{});setPage(1)}}><option value="">Todos, incluidos retirados</option>{farms.data?.items.map(f=><option key={f.id} value={f.id}>{f.name}{f.deletedAt?' (retirado)':''}</option>)}</select></label>
   <label>Tipo de evento<select className="block w-full min-h-11 rounded border p-2" value={type} onChange={e=>{setType(e.target.value);setPage(1)}}><option value="">Todos los tipos</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
   <label>Desde (hora local)<input className="block w-full min-w-0 min-h-11 rounded border p-2" type="datetime-local" value={from} onChange={e=>{setFrom(e.target.value);setPage(1)}}/></label>
   <label>Hasta (hora local)<input className="block w-full min-w-0 min-h-11 rounded border p-2" type="datetime-local" value={to} onChange={e=>{setTo(e.target.value);setPage(1)}}/></label>
  </div>
  <HistoryList query={query} page={page} setPage={setPage}/>
 </ResourceLayout>
}
