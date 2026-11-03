import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../hooks/useAuth.js'
import { useFarmScope } from '../../hooks/useFarmScope.js'
import { api } from '../../services/api.js'
import ResourceLayout from '../../components/ResourceLayout.jsx'
import ConfirmAction from '../../components/ConfirmAction.jsx'
import FarmForm from './FarmForm.jsx'
import { Link } from 'react-router-dom'
import { Beef, Building2, ChevronDown, Droplets, MapPinned, Pencil, Plus, Ruler, Trash2 } from 'lucide-react'
import { EmptyResources, ResourceFormDialog, ResourceToolbar } from '../../components/ManagementUI.jsx'
export default function Establecimientos() {
  const scope = useFarmScope()
  const query = scope.farms
  const { account } = useAuth()
  const client = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [search, setSearch] = useState('')
  const visible = (query.data?.items ?? []).filter(f => (!scope.farmId || String(f.id) === scope.farmId) && f.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  async function save(body) {
    await api.request(editing.id ? `/farms/${editing.id}` : '/farms', {
      method: editing.id ? 'PATCH' : 'POST',
      body,
    })
    setEditing(null)
    await client.invalidateQueries({ queryKey: ['account', account.id] })
  }
  return (
    <ResourceLayout title="Establecimientos" query={query} redesigned eyebrow="Gestión de campos" description="Consultá y administrá los campos vinculados a tu cuenta."
      actions={account.role === 'owner' && <button className="primary-button" onClick={() => setEditing({})}><Plus size={18} aria-hidden="true" />Nuevo establecimiento</button>}>
      <ResourceToolbar search={search} onSearch={setSearch} label="Buscar establecimiento" count={visible.length} onRefresh={() => query.refetch()} refreshing={query.isFetching} />
      {editing && (
        <ResourceFormDialog title={editing.id ? `Editar ${editing.name}` : 'Crear establecimiento'} onClose={() => setEditing(null)}>
        <FarmForm
          key={editing.id ?? 'new'}
          initial={editing.id ? editing : undefined}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
        </ResourceFormDialog>
      )}
      <div className="farms-grid">
        {visible.map((f) => (
            <article key={f.id} className="farm-card">
              <div className="farm-card-top"><span className="farm-symbol"><Building2 size={23} aria-hidden="true" /></span><div><h2>{f.name}</h2><p>{f.description}</p></div>
                {account.role === 'owner' && <button className="icon-button" aria-label={`Editar ${f.name}`} title="Editar" onClick={() => setEditing(f)}><Pencil size={17} aria-hidden="true" /></button>}
              </div>
              <div className="farm-priorities">
                <div><span><Ruler size={17} aria-hidden="true" />Superficie</span><strong>{Number(f.areaHa).toLocaleString('es-AR')} ha</strong></div>
                <div><span><Beef size={17} aria-hidden="true" />Animales</span><strong>{f.animalCount}</strong></div>
                <div><span><Droplets size={17} aria-hidden="true" />Bebederos</span><strong>{f.troughCount}</strong></div>
              </div>
              <div className="farm-location"><MapPinned size={18} aria-hidden="true" /><div><strong>Ubicación administrativa</strong><small>Ubicación: {f.latitude}, {f.longitude}</small></div></div>
              <details className="technical-details"><summary>Configuración técnica<ChevronDown size={16} aria-hidden="true" /></summary><div><span>Zona horaria<strong>{f.timezone}</strong></span><span>Antigüedad máxima<strong>{f.staleMinutes} minutos</strong></span></div></details>
              <div className="farm-actions"><Link className="secondary-button" to={`/dashboard?farmId=${f.id}`}>Ver panel del campo</Link>
                {account.role === 'owner' && <button className="danger-ghost" onClick={() => setRemoving(f)}><Trash2 size={16} aria-hidden="true" />Eliminar</button>}
              </div>
            </article>
          ))}
      </div>
      {query.data && !visible.length && <EmptyResources icon={Building2} title={search ? 'No encontramos establecimientos' : 'No hay establecimientos disponibles.'} description={search ? 'Probá con otro nombre o cambiá el establecimiento seleccionado.' : 'Los campos vinculados a tu cuenta aparecerán aquí.'} />}
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
