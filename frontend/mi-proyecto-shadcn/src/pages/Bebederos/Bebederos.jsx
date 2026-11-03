import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, Droplets, History, List, MapPin, Plus, Trash2, Wrench, X } from 'lucide-react'
import { ResourceHistory } from '../Historial/Historial.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useFarmScope } from '../../hooks/useFarmScope.js'
import { useTroughs } from '../../hooks/useTroughs.js'
import { api } from '../../services/api.js'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import ConfirmAction from '../../components/ConfirmAction.jsx'
import { Freshness } from '../../components/TelemetryDetails.jsx'
import Pagination from '../../components/Pagination.jsx'
import { EmptyResources, ResourceFormDialog, ResourceMap, ResourceToolbar } from '../../components/ManagementUI.jsx'
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
  const [search, setSearch] = useState('')
  const items = selected ? (query.data ? [query.data] : []) : (query.data?.items ?? [])
  const visible = items.filter(t => t.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const recent = items.filter(t => t.freshness === 'fresh' && t.waterLevel != null)
  const average = recent.length ? Math.round(recent.reduce((sum, t) => sum + t.waterLevel, 0) / recent.length) : null
  const outdated = items.filter(t => t.freshness !== 'fresh').length
  const partial = !selected && query.data?.total > items.length
  const states = [['Operativo', 'Operativos', 'operational', Check], ['En mantenimiento', 'Mantenimiento', 'maintenance', Wrench], ['Fuera de servicio', 'No operativos', 'inactive', X]]
  async function refresh() {
    await client.invalidateQueries({ queryKey: ['account', account.id] })
  }
  return <ResourceLayout title="Bebederos" query={query} redesigned eyebrow="Monitoreo de agua" description="Consultá el nivel, la vigencia y el estado operativo de cada punto de agua."
    actions={!scope.invalidScope && account.role === 'owner' && scope.farmId && <button className="primary-button" onClick={() => setAdding(true)}><Plus size={18} aria-hidden="true" />Nuevo bebedero</button>}>
    {scope.invalidScope ? <p>No tenés acceso al establecimiento seleccionado.</p> : <>
      {account.role === 'owner' && !scope.farmId && <p className="management-notice">Seleccioná un establecimiento para crear un bebedero.</p>}
      {adding && scope.farmId && <ResourceFormDialog title="Nuevo bebedero" onClose={() => setAdding(false)}><TroughForm onCancel={() => setAdding(false)} onSave={async body => {
        await api.request(`/farms/${scope.farmId}/troughs`, { method: 'POST', body })
        setAdding(false)
        await refresh()
      }} /></ResourceFormDialog>}
      {query.data && <section className="trough-summary" aria-label="Resumen de bebederos">
        <div className="summary-title"><div><h2>Resumen de bebederos</h2><p>{scope.selected?.name || 'Todos los establecimientos'}{partial ? ` · Página ${page}: ${items.length} de ${query.data.total} bebederos` : ` · ${items.length} bebederos`}</p></div><span className="monitoring-badge"><Droplets size={14} aria-hidden="true" />Lecturas recibidas</span></div>
        <div className="summary-grid">
          <article className="water-average"><div className="summary-card-label"><span>Nivel promedio de agua</span><Droplets size={18} aria-hidden="true" /></div><strong>{average === null ? '—' : `${average}%`}</strong><div className="level-track" aria-hidden="true"><i style={{ width: `${average ?? 0}%` }} /></div><p>{recent.length ? 'Promedio de lecturas vigentes' : 'Sin lecturas vigentes para calcular el promedio'}{partial && ' en esta página'}</p></article>
          <article className="stale-card"><div className="summary-card-label"><span>Sin datos recientes</span><History size={18} aria-hidden="true" /></div><strong>{outdated}<small> de {items.length} bebederos</small></strong><p>Incluye mediciones desactualizadas y sin datos recibidos.</p></article>
        </div>
        <article className="operational-summary"><div className="operational-title"><strong>Estado operativo</strong><span>{partial ? 'En esta página' : `${items.length} bebederos`}</span></div>
          <div className="status-bar" aria-hidden="true">{states.map(([value, , tone]) => { const count = items.filter(t => t.operationalState === value).length; return count > 0 && <i key={value} className={tone} style={{ flex: count }} /> })}</div>
          <div className="status-counts">{states.map(([value, label, , Icon]) => <div key={value}><span><Icon size={15} aria-hidden="true" />{label}</span><strong>{items.filter(t => t.operationalState === value).length}</strong><small>{items.length ? Math.round(items.filter(t => t.operationalState === value).length / items.length * 100) : 0}% {partial ? 'de la página' : 'del total'}</small></div>)}</div>
        </article>
      </section>}
      <ResourceMap scope={scope} type="trough" title="Mapa de bebederos" description="Ubicación administrativa y última posición GPS recibida" />
      <details className="trough-list-shell" aria-label="Listado de bebederos" open>
        <summary className="list-disclosure"><span className="disclosure-icon"><List size={20} aria-hidden="true" /></span><span><h2>Listado de bebederos</h2><small>{scope.selected?.name || 'Todos los establecimientos'} · Consultá sus fichas y antecedentes</small></span><span className="list-count">{selected ? items.length : query.data?.total ?? '—'}</span><ChevronDown size={20} aria-hidden="true" /></summary>
        <div className="trough-list-content">
          <ResourceToolbar search={search} onSearch={setSearch} label="Buscar bebedero" count={visible.length} onRefresh={() => query.refetch()} refreshing={query.isFetching} paginated={partial} />
          <div className="trough-cards">{visible.map(t => <article key={t.id} className="trough-card">
            <div className="trough-card-main"><div className={`water-gauge ${t.waterLevel == null ? 'none' : t.waterCategory === 'Crítico' ? 'critical' : t.waterCategory === 'Bajo' ? 'low' : ''}`}><Droplets size={23} aria-hidden="true" /><strong>{t.waterLevel == null ? '—' : `${t.waterLevel}%`}</strong><small>{t.waterLevel == null ? 'Sin medición' : t.waterCategory}</small></div>
              <div><div className="trough-name"><div><h3>{t.name}</h3><p>Capacidad: <strong>{t.capacityLiters} litros</strong></p></div><span className={`operation-badge ${t.operationalState === 'En mantenimiento' ? 'en-mantenimiento' : t.operationalState === 'Fuera de servicio' ? 'fuera-de-servicio' : ''}`}>{t.operationalState}</span></div>
                <div className="trough-info-grid"><div><History size={17} aria-hidden="true" /><div><small>Última medición</small><div className={`freshness-copy ${t.freshness}`}><Freshness value={t.freshness} date={t.lastUpdatedAt} /></div></div></div><div><MapPin size={17} aria-hidden="true" /><div><small>Ubicación</small><strong>{t.latitude == null ? 'Sin ubicación' : `${t.latitude}, ${t.longitude}`}</strong><em>{t.locationSource === 'device' ? 'GPS de dispositivo' : 'Administrativa'}</em></div></div></div>
              </div>
            </div>
            <div className="trough-card-actions"><button className="secondary-button" aria-expanded={historyId === t.id} onClick={() => setHistoryId(historyId === t.id ? null : t.id)}><History size={15} aria-hidden="true" />{historyId === t.id ? 'Ocultar antecedentes' : 'Ver antecedentes'}</button>{account.role === 'owner' && <button className="danger-ghost" onClick={() => setRemoving(t)}><Trash2 size={16} aria-hidden="true" />Eliminar</button>}</div>
            {historyId === t.id && <div className="resource-history"><ResourceHistory resourceType="troughs" resource={t} /></div>}
          </article>)}</div>
          {query.data && !visible.length && <EmptyResources icon={Droplets} title={search ? 'No encontramos bebederos' : 'No hay bebederos disponibles.'} description={search ? 'Probá con otro nombre en esta página.' : undefined} />}
          {!selected && <Pagination query={query} page={page} setPage={setPage} />}
        </div>
      </details>
    </>}
    <ConfirmAction open={!!removing} title="Eliminar bebedero" description="No puede tener tareas abiertas. Se conservarán sus lecturas y antecedentes." onCancel={() => setRemoving(null)} onConfirm={async () => {
      await api.request(`/troughs/${removing.id}`, { method: 'DELETE' })
      setRemoving(null)
      await refresh()
    }} />
  </ResourceLayout>
}
