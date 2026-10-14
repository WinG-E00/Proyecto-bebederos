import { Link } from 'react-router-dom'
export default function MapFallback({ markers, tileError }) {
  return (
    <div className="space-y-2">
      {tileError && (
        <p role="status">
          No se pudo cargar el mapa base. Las ubicaciones y fichas siguen disponibles en la lista.
        </p>
      )}
      <h2 className="font-semibold">Ubicaciones disponibles</h2>
      {!markers.length && <p>No hay ubicaciones disponibles para mostrar.</p>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {markers.map((m) => (
          <li key={`${m.type}:${m.id}`}>
            <Link
              className="inline-flex min-h-11 items-center rounded-lg border px-3"
              to={`/${m.type === 'animal' ? 'animals' : 'troughs'}?farmId=${m.farmId}&id=${m.id}`}
            >
              {m.type === 'animal' ? 'Animal' : 'Bebedero'}: {m.name} · {m.latitude}, {m.longitude}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
