import { ChevronDown, MapPin } from 'lucide-react'

export default function FarmSelector({ scope, compact = false }) {
  if (compact) return <label className="app-nav-farm">
    <MapPin size={17} aria-hidden="true" />
    <select aria-label="Establecimiento" value={scope.farmId} onChange={event => scope.selectFarm(event.target.value)} disabled={scope.farms.isPending || !!scope.farms.error}>
      <option value="">{scope.farms.isPending ? 'Cargando campos…' : scope.farms.error ? 'Campos no disponibles' : 'Todos los establecimientos'}</option>
      {scope.farms.data?.items.map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
    </select>
    <ChevronDown size={16} aria-hidden="true" />
  </label>
  return (
    <label className="grid gap-1">
      Establecimiento
      <select
        className="min-h-11 rounded-lg border border-border bg-background p-2"
        value={scope.farmId}
        onChange={(e) => scope.selectFarm(e.target.value)}
      >
        <option value="">Todos los establecimientos</option>
        {scope.farms.data?.items.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </label>
  )
}
