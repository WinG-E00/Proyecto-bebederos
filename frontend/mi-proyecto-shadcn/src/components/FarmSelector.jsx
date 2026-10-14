export default function FarmSelector({ scope }) {
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
