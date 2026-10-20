import { useId, useState } from 'react'
import { Droplets, Fence } from 'lucide-react'
import { Link } from 'react-router-dom'
export default function MapFallback({ markers, tileError, compact = false }) {
  const filterId = useId()
  const Heading = compact ? 'h3' : 'h2'
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [page, setPage] = useState(1)
  const filtered = compact ? markers.filter(m => (type === 'all' || m.type === type) && m.name.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())) : markers
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)))
  const visible = compact ? filtered.slice((currentPage - 1) * 8, currentPage * 8) : markers

  return (
    <div className="space-y-2">
      {tileError && (
        <p role="status">
          No se pudo cargar el mapa base. Las ubicaciones y fichas siguen disponibles en la lista.
        </p>
      )}
      <Heading className="font-semibold">Ubicaciones disponibles</Heading>
      {!markers.length && <p>No hay ubicaciones disponibles para mostrar.</p>}
      {compact && <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">Buscar ubicación<input type="search" value={search} placeholder="Nombre del animal o bebedero" className="min-h-11 rounded-lg border px-3" onChange={e => { setSearch(e.target.value); setPage(1) }} /></label>
        <label htmlFor={filterId} className="grid gap-1">Tipo<select id={filterId} aria-label="Tipo" value={type} className="min-h-11 rounded-lg border px-3" onChange={e => { setType(e.target.value); setPage(1) }}><option value="all">Todos</option><option value="animal">Animales</option><option value="trough">Bebederos</option></select></label>
      </div>}
      {compact && markers.length > 0 && !filtered.length && <p role="status">No hay coincidencias. Probá otro nombre o tipo.</p>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {visible.map((m) => (
          <li key={`${m.type}:${m.id}`}>
            <Link
              className="inline-flex min-h-11 items-center rounded-lg border px-3"
              to={`/${m.type === 'animal' ? 'animals' : 'troughs'}?farmId=${m.farmId}&id=${m.id}`}
            >
              {compact && (m.type === 'animal' ? <Fence size={18} className="mr-2 shrink-0" aria-hidden="true" /> : <Droplets size={18} className="mr-2 shrink-0" aria-hidden="true" />)}
              {m.type === 'animal' ? 'Animal' : 'Bebedero'}: {m.name}{!compact && ` · ${m.latitude}, ${m.longitude}`}
            </Link>
          </li>
        ))}
      </ul>
      {compact && filtered.length > 8 && <div className="flex flex-wrap items-center gap-3" aria-label="Paginación de ubicaciones">
        <button type="button" className="min-h-11 px-3 underline disabled:opacity-50" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
        <span role="status">Página {currentPage} de {Math.ceil(filtered.length / 8)}</span>
        <button type="button" className="min-h-11 px-3 underline disabled:opacity-50" disabled={currentPage * 8 >= filtered.length} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
      </div>}
    </div>
  )
}
