import { useId, useState } from 'react'
import { ChevronDown, ChevronRight, Crosshair, MapPinned, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import CowIcon from './icons/CowIcon.jsx'
import WaterJugIcon from './icons/WaterJugIcon.jsx'
import './MapFallback.css'

// Vista completa (pantalla Mapa): ubicaciones agrupadas en desplegables por tipo.
function GroupedLocations({ markers, tileError, onFocus }) {
  const [search, setSearch] = useState('')
  const term = search.toLocaleLowerCase('es-AR').trim()
  const matches = markers.filter(m => m.name.toLocaleLowerCase('es-AR').includes(term))
  const groups = [
    { type: 'animal', title: 'Animales', label: 'Animal', empty: 'No hay animales con ubicación GPS.', Icon: CowIcon, path: 'animals' },
    { type: 'trough', title: 'Bebederos', label: 'Bebedero', empty: 'No hay bebederos con ubicación.', Icon: WaterJugIcon, path: 'troughs' },
  ]
  return (
    <section className="map-locations" aria-labelledby="map-locations-title">
      {tileError && <p role="status" className="map-locations-warning">No se pudo cargar el mapa base. Las ubicaciones y fichas siguen disponibles en la lista.</p>}
      <header className="map-locations-head">
        <span className="map-locations-head-icon"><MapPinned size={20} aria-hidden="true" /></span>
        <div><h2 id="map-locations-title">Ubicaciones disponibles</h2><p>{markers.length} {markers.length === 1 ? 'ubicación' : 'ubicaciones'} en el mapa · {onFocus ? 'tocá una para verla en el mapa' : 'tocá una para abrir su ficha'}</p></div>
      </header>
      {!markers.length ? <p className="map-locations-empty">No hay ubicaciones disponibles para mostrar.</p> : <>
        {markers.length > 6 && <label className="map-locations-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label="Buscar ubicación" placeholder="Buscar animal o bebedero" value={search} onChange={e => setSearch(e.target.value)} /></label>}
        {groups.map(g => {
          const all = markers.filter(m => m.type === g.type)
          const items = matches.filter(m => m.type === g.type)
          return (
            <details key={g.type} className={`map-group map-group--${g.type}`} open>
              <summary>
                <span className="map-group-icon"><g.Icon size={20} aria-hidden="true" /></span>
                <span className="map-group-title"><strong>{g.title}</strong><small>{term ? `${items.length} de ${all.length}` : `${all.length} con ubicación`}</small></span>
                <span className="map-group-count">{items.length}</span>
                <ChevronDown className="map-group-chevron" size={20} aria-hidden="true" />
              </summary>
              {items.length ? <ul className="map-group-list">
                {items.map(m => (
                  <li key={`${m.type}:${m.id}`} className={onFocus ? 'map-location-item' : undefined}>
                    {onFocus ? <>
                      <button type="button" className="map-location-link" onClick={() => onFocus(m)}>
                        <span className="map-location-icon"><g.Icon size={18} aria-hidden="true" /></span>
                        <span className="map-location-copy">
                          <strong><span className="sr-only">Ver en el mapa: </span>{m.name}</strong>
                          <small>{' '}{m.latitude}, {m.longitude}</small>
                        </span>
                        <Crosshair size={17} aria-hidden="true" />
                      </button>
                      <Link className="map-location-record" to={`/${g.path}?farmId=${m.farmId}&id=${m.id}`} aria-label={`Abrir ficha · ${g.label}: ${m.name}`} title="Abrir ficha">
                        <ChevronRight size={18} aria-hidden="true" />
                      </Link>
                    </> : <Link className="map-location-link" to={`/${g.path}?farmId=${m.farmId}&id=${m.id}`}>
                      <span className="map-location-icon"><g.Icon size={18} aria-hidden="true" /></span>
                      <span className="map-location-copy">
                        <strong><span className="sr-only">{g.label}: </span>{m.name}</strong>
                        <small>{' '}{m.latitude}, {m.longitude}</small>
                      </span>
                      <ChevronRight size={17} aria-hidden="true" />
                    </Link>}
                  </li>
                ))}
              </ul> : <p className="map-group-empty">{term ? 'No hay coincidencias.' : g.empty}</p>}
            </details>
          )
        })}
      </>}
    </section>
  )
}

export default function MapFallback({ markers, tileError, compact = false, onFocus }) {
  return compact ? <CompactLocations markers={markers} tileError={tileError} compact /> : <GroupedLocations markers={markers} tileError={tileError} onFocus={onFocus} />
}

function CompactLocations({ markers, tileError, compact }) {
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
              {compact && (m.type === 'animal' ? <CowIcon size={18} className="mr-2 shrink-0" aria-hidden="true" /> : <WaterJugIcon size={18} className="mr-2 shrink-0" aria-hidden="true" />)}
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
