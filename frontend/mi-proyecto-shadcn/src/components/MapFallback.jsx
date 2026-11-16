import { useId, useState } from 'react'
import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function MapFallback({ markers, tileError, compact = false }) {
  const filterId = useId()
  const Heading = compact ? 'h3' : 'h2'
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [page, setPage] = useState(1)
  const filtered = compact
    ? markers.filter(m =>
      (type === 'all' || m.type === type) &&
      m.name.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim()))
    : markers
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)))
  const visible = compact ? filtered.slice((currentPage - 1) * 8, currentPage * 8) : markers

  return (
    <section className="space-y-4">
      {tileError && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        >
          No se pudo cargar el mapa base. Las ubicaciones y fichas siguen disponibles en la lista.
        </p>
      )}
      <Heading className="font-semibold text-foreground">Ubicaciones disponibles</Heading>
      {!markers.length && (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No hay ubicaciones disponibles para mostrar.
        </p>
      )}
      {compact && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            Buscar ubicación
            <input
              type="search"
              value={search}
              placeholder="Nombre del animal o bebedero"
              className="min-h-11 rounded-lg border border-input bg-background px-3 font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </label>
          <label htmlFor={filterId} className="grid gap-1.5 text-sm font-medium text-foreground">
            Tipo
            <select
              id={filterId}
              aria-label="Tipo"
              value={type}
              className="min-h-11 rounded-lg border border-input bg-background px-3 font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
              onChange={e => { setType(e.target.value); setPage(1) }}
            >
              <option value="all">Todos</option>
              <option value="animal">Animales</option>
              <option value="trough">Bebederos</option>
            </select>
          </label>
        </div>
      )}
      {compact && markers.length > 0 && !filtered.length && (
        <p role="status" className="text-sm text-muted-foreground">
          No hay coincidencias. Probá otro nombre o tipo.
        </p>
      )}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(m => {
          const typeLabel = m.type === 'animal' ? 'Animal' : 'Bebedero'
          return (
            <li key={`${m.type}:${m.id}`}>
              <Link
                aria-label={`${typeLabel}: ${m.name}, coordenadas ${m.latitude}, ${m.longitude}`}
                className="flex h-full min-h-20 items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/60 focus-visible:outline-3 focus-visible:outline-[#d3a865]"
                to={`/${m.type === 'animal' ? 'animals' : 'troughs'}?farmId=${m.farmId}&id=${m.id}`}
              >
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                  <MapPin size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-muted-foreground">{typeLabel}</span>
                  <strong className="block break-words text-sm font-semibold text-foreground">{m.name}</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {m.latitude}, {m.longitude}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      {compact && filtered.length > 8 && (
        <div className="flex flex-wrap items-center gap-3" aria-label="Paginación de ubicaciones">
          <button
            type="button"
            className="min-h-11 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-3 focus-visible:outline-[#d3a865] disabled:opacity-50"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Anterior
          </button>
          <span role="status" className="text-sm text-muted-foreground">
            Página {currentPage} de {Math.ceil(filtered.length / 8)}
          </span>
          <button
            type="button"
            className="min-h-11 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-3 focus-visible:outline-[#d3a865] disabled:opacity-50"
            disabled={currentPage * 8 >= filtered.length}
            onClick={() => setPage(currentPage + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </section>
  )
}
