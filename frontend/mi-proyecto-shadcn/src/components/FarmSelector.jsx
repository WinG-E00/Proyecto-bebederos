export default function FarmSelector({ scope }) {
  return (
    <label className="grid gap-1.5 max-w-md text-sm font-semibold text-foreground">
      <span>Establecimiento</span>
      <select
        className="min-h-11 rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-3 focus-visible:outline-[#d3a865]"
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
