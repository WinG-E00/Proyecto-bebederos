import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Beef, ChevronDown, Droplets, History, List, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { ResourceHistory } from '../Historial/Historial.jsx'
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
import { EmptyResources, MetricCard, ResourceFormDialog, ResourceMap, ResourceToolbar } from '../../components/ManagementUI.jsx'
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
  const [search, setSearch] = useState('')
  async function refresh() {
    await client.invalidateQueries({ queryKey: ['account', account.id] })
  }
  const items = selected ? (query.data ? [query.data] : []) : (query.data?.items ?? [])
  const visible = items.filter(a => `${a.name} ${a.breed} ${a.species}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const partial = !selected && query.data?.total > items.length
  return <ResourceLayout title="Animales" query={query} redesigned eyebrow="Monitoreo ganadero" description="Identificación, última posición recibida y visitas estimadas a puntos de agua."
    actions={!scope.invalidScope && account.role === 'owner' && scope.farmId && <button className="primary-button" onClick={() => setEditing({})}><Plus size={18} aria-hidden="true" />Nuevo animal</button>}>
    {scope.invalidScope ? <p>No tenés acceso al establecimiento seleccionado.</p> : <>
      {account.role === 'owner' && !scope.farmId && <p className="management-notice">Seleccioná un establecimiento para crear un animal.</p>}
      {editing && <ResourceFormDialog title={editing.id ? `Editar ${editing.name}` : 'Nuevo animal'} onClose={() => setEditing(null)}><AdministrativeForm key={editing.id ?? 'new'} fields={fields} initial={editing} label="Guardar animal" onCancel={() => setEditing(null)} onSave={async body => {
        await api.request(editing.id ? `/animals/${editing.id}` : `/farms/${scope.farmId}/animals`, { method: editing.id ? 'PATCH' : 'POST', body })
        setEditing(null)
        await refresh()
      }} /></ResourceFormDialog>}
      {query.data && <section className="trough-summary" aria-label="Resumen de animales">
        <div className="summary-title"><div><h2>Resumen de animales</h2><p>{scope.selected?.name || 'Todos los establecimientos'}{partial && ` · Página ${page}: ${items.length} de ${query.data.total} animales`}</p></div><span className="monitoring-badge"><Beef size={14} aria-hidden="true" />Ganado</span></div>
        <div className="metrics-grid animal-metrics">
          <MetricCard icon={Beef} label={partial ? 'Animales en esta página' : 'Animales registrados'} value={items.length} detail="Identificación individual" tone="ochre" />
          <MetricCard icon={MapPin} label="GPS reciente" value={items.filter(a => a.position && a.freshness === 'fresh').length} detail={partial ? 'En esta página' : 'Última posición recibida'} />
          <MetricCard icon={History} label="GPS sin actualizar" value={items.filter(a => a.position && a.freshness !== 'fresh').length} detail={partial ? 'En esta página' : 'Requieren revisión'} tone="red" />
          <MetricCard icon={MapPin} label="Sin ubicación" value={items.filter(a => !a.position).length} detail={partial ? 'En esta página' : 'Nunca recibida'} tone="blue" />
        </div>
      </section>}
      <ResourceMap scope={scope} type="animal" title="Mapa de animales" description="Última posición GPS recibida de cada animal" />
      <details className="trough-list-shell" aria-label="Listado de animales" open>
        <summary className="list-disclosure"><span className="disclosure-icon"><List size={20} aria-hidden="true" /></span><span><h2>Listado de animales</h2><small>{scope.selected?.name || 'Todos los establecimientos'} · Consultá sus fichas y antecedentes</small></span><span className="list-count">{selected ? items.length : query.data?.total ?? '—'}</span><ChevronDown size={20} aria-hidden="true" /></summary>
        <div className="trough-list-content">
          <ResourceToolbar search={search} onSearch={setSearch} label="Buscar identificación o raza" count={visible.length} onRefresh={() => query.refetch()} refreshing={query.isFetching} paginated={partial} />
          <div className="trough-cards">{visible.map(a => <article key={a.id} className="trough-card">
            <div className="trough-card-main animal-card-main"><span className="animal-portrait"><Beef size={32} aria-hidden="true" /><small>{a.species}</small></span><div>
              <div className="trough-name"><div><h3>{a.name}</h3><p>{a.species} · {a.breed} · {a.ageYears} {a.ageYears === 1 ? 'año' : 'años'}</p></div><span className="operation-badge">{a.state}</span></div>
              <div className="trough-info-grid"><div><MapPin size={17} aria-hidden="true" /><div><small>Última posición GPS</small><strong>{a.position ? `${a.position.latitude}, ${a.position.longitude}` : 'Sin ubicación recibida'}</strong><div className={`freshness-copy ${a.freshness}`}><Freshness value={a.freshness} date={a.position?.measuredAt} /></div></div></div>
                <div><Droplets size={17} aria-hidden="true" /><div><h4>Última visita al bebedero</h4><strong>{a.lastVisit ? `${a.lastVisit.troughName} · ${formatDate(a.lastVisit.visitedAt)}` : 'Sin visitas registradas'}</strong><em>Visita estimada por proximidad; no acredita consumo.</em></div></div>
              </div>
            </div></div>
            <div className="trough-card-actions"><button className="secondary-button" aria-expanded={historyId === a.id} onClick={() => setHistoryId(historyId === a.id ? null : a.id)}><History size={15} aria-hidden="true" />{historyId === a.id ? 'Ocultar antecedentes' : 'Ver antecedentes'}</button>
              {account.role === 'owner' && <><button className="secondary-button" onClick={() => setEditing(a)}><Pencil size={15} aria-hidden="true" />Editar</button><button className="danger-ghost" onClick={() => setRemoving(a)}><Trash2 size={16} aria-hidden="true" />Eliminar</button></>}
            </div>
            {historyId === a.id && <div className="resource-history"><ResourceHistory resourceType="animals" resource={a} /></div>}
          </article>)}</div>
          {query.data && !visible.length && <EmptyResources icon={Beef} title={search ? 'No encontramos animales' : 'No hay animales disponibles.'} description={search ? 'Probá con otra identificación o raza en esta página.' : undefined} />}
          {!selected && <Pagination query={query} page={page} setPage={setPage} />}
        </div>
      </details>
    </>}
    <ConfirmAction open={!!removing} title="Eliminar animal" description="Se conservarán sus posiciones y visitas estimadas." onCancel={() => setRemoving(null)} onConfirm={async () => {
      await api.request(`/animals/${removing.id}`, { method: 'DELETE' })
      setRemoving(null)
      await refresh()
    }} />
  </ResourceLayout>
}
