import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMap } from '../../hooks/useMap.js'
import MapFallback from '../../components/MapFallback.jsx'
import AsyncState from '../../components/AsyncState.jsx'
import { COW_PATHS, COW_RECT, WATER_JUG_PATHS, svgMarkup } from '../../components/icons/iconPaths.js'
import { boundaryFor, useDrawnBoundaries } from '../../lib/farmBoundaries.js'
import { List, Map, Satellite } from 'lucide-react'
import './MapaBebederos.css'

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
// Capas base: imágenes satelitales de Esri (gratuitas con atribución) y el mapa de OpenStreetMap.
const BASE_LAYERS = {
  satellite: {
    label: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    options: { attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics', maxNativeZoom: 18, maxZoom: 19 },
    boundary: '#ffd23f',
  },
  streets: {
    label: 'Calles',
    url: import.meta.env.VITE_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: { attribution: OSM_ATTRIBUTION, maxZoom: 19 },
    boundary: '#e8590c',
  },
}
const BASE_KEY = 'bebederos:capa-mapa'
function initialBase() {
  try { return localStorage.getItem(BASE_KEY) === 'streets' ? 'streets' : 'satellite' } catch { return 'satellite' }
}
const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const valid = (m) =>
  Number.isFinite(m.latitude) &&
  Number.isFinite(m.longitude) &&
  Math.abs(m.latitude) <= 90 &&
  Math.abs(m.longitude) <= 180
const markerKey = m => `${m.type}:${m.id}`
// Agrupa las ubicaciones serializadas [farmId, lat, lng] por establecimiento.
function farmPositions(positionsKey) {
  const rows = JSON.parse(positionsKey)
  return farmId => rows.filter(([id]) => String(id) === String(farmId)).map(([, latitude, longitude]) => ({ latitude, longitude }))
}
const markerIcons = {
  animal: L.divIcon({ className: '', html: `<span class="map-pin map-pin--animal">${svgMarkup(COW_PATHS, COW_RECT)}</span>`, iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -16] }),
  trough: L.divIcon({ className: '', html: `<span class="map-pin map-pin--trough">${svgMarkup(WATER_JUG_PATHS)}</span>`, iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -16] }),
}

export default function MapaBebederos({ farmId = '', center, compact = false, resourceType, farms, onReady }) {
  const [view, setView] = useState('map')
  const [base, setBase] = useState(initialBase)
  const showMap = !compact || view === 'map'
  const query = useMap(farmId)
  const positions = (query.data ?? []).filter(m => valid(m) && (!resourceType || m.type === resourceType))
  const drawn = useDrawnBoundaries()
  const boundaryFarms = (farms ?? (center ? [center] : [])).filter(f => !farmId || String(f.id) === String(farmId))
  const positionsKey = JSON.stringify((query.data ?? []).filter(valid).map(m => [m.farmId, m.latitude, m.longitude]))
  const container = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const boundaryLayer = useRef(null)
  const markers = useRef(new globalThis.Map())
  const centered = useRef(null)
  const [tileError, setTileError] = useState(false)
  const navigate = useNavigate()

  const chooseBase = useCallback((value) => {
    setBase(value)
    try { localStorage.setItem(BASE_KEY, value) } catch { /* Preferencia sin almacenamiento. */ }
  }, [])

  // Vuela hasta el marcador y abre su ficha resumida.
  const focusMarker = useCallback((m, { scroll = false } = {}) => {
    const instance = map.current
    const marker = markers.current.get(markerKey(m))
    if (!instance || !marker) return
    if (scroll) container.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' })
    const target = [m.latitude, m.longitude]
    const zoom = Math.max(instance.getZoom(), 17)
    if (reducedMotion()) {
      instance.setView(target, zoom)
      marker.openPopup()
    } else {
      instance.once('moveend', () => marker.openPopup())
      instance.flyTo(target, zoom, { duration: 0.8 })
    }
  }, [])

  useEffect(() => {
    if (!showMap) return
    const markerMap = markers.current
    const instance = L.map(container.current, { zoomControl: true }).setView([0, 0], 2)
    map.current = instance
    boundaryLayer.current = L.layerGroup().addTo(instance)
    layer.current = L.layerGroup().addTo(instance)
    const observer = new ResizeObserver(() => instance.invalidateSize())
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      instance.stop()
      instance.off()
      instance.remove()
      map.current = null
      layer.current = null
      boundaryLayer.current = null
      markerMap.clear()
      centered.current = null
    }
  }, [showMap])

  useEffect(() => {
    if (!map.current || !onReady) return
    onReady({ map: map.current, setBase: chooseBase })
    return () => onReady(null)
  }, [showMap, onReady, chooseBase])

  // Capa base (satélite o mapa) y, en satélite, nombres de lugares encima.
  useEffect(() => {
    const instance = map.current
    if (!instance) return
    const config = BASE_LAYERS[base]
    setTileError(false)
    const tiles = L.tileLayer(config.url, config.options).addTo(instance)
    tiles.on('tileerror', () => setTileError(true))
    const labels = config.labels ? L.tileLayer(config.labels, { maxNativeZoom: 18, maxZoom: 19, pane: 'overlayPane' }).addTo(instance) : null
    return () => {
      tiles.remove()
      labels?.remove()
    }
  }, [base, showMap])

  // Límites de los establecimientos: borde oscuro debajo para que el color se lea sobre cualquier fondo.
  const boundaryKey = JSON.stringify(boundaryFarms.map(f => [f.id, f.name, f.latitude, f.longitude, f.areaHa]))
  useEffect(() => {
    const group = boundaryLayer.current
    if (!group) return
    group.clearLayers()
    const color = BASE_LAYERS[base].boundary
    const positionsByFarm = farmPositions(positionsKey)
    for (const farm of JSON.parse(boundaryKey).map(([id, name, latitude, longitude, areaHa]) => ({ id, name, latitude, longitude, areaHa }))) {
      const boundary = boundaryFor(farm, drawn, positionsByFarm(farm.id))
      if (!boundary) continue
      const approx = boundary.source === 'approx'
      L.polygon(boundary.points, { color: '#111', weight: 7, opacity: 0.35, fill: false, interactive: false }).addTo(group)
      const outline = L.polygon(boundary.points, {
        color, weight: 3.5, opacity: 1, dashArray: approx ? '10 8' : null,
        fillColor: color, fillOpacity: farmId ? 0.1 : 0.06, interactive: false,
      }).addTo(group)
      // Etiqueta sobre el borde superior para no tapar los marcadores de adentro.
      const bounds = outline.getBounds()
      L.tooltip({ permanent: true, direction: 'top', offset: [0, -4], className: 'map-boundary-label', interactive: false })
        .setLatLng([bounds.getNorth(), bounds.getCenter().lng])
        .setContent(`${farm.name}${approx ? ' · límite aproximado' : ''}`)
        .addTo(group)
    }
  }, [boundaryKey, positionsKey, drawn, base, farmId, showMap])

  useEffect(() => {
    if (!layer.current) return
    layer.current.clearLayers()
    markers.current.clear()
    for (const m of (query.data ?? []).filter(m => valid(m) && (!resourceType || m.type === resourceType))) {
      const animal = m.type === 'animal'
      const popup = document.createElement('div')
      popup.className = 'map-popup'
      const kind = document.createElement('small')
      kind.textContent = animal ? 'Animal' : 'Bebedero'
      const heading = document.createElement('strong')
      heading.textContent = `${animal ? 'Animal' : 'Bebedero'}: ${m.name}`
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = 'Abrir ficha'
      button.addEventListener('click', () =>
        navigate(`/${animal ? 'animals' : 'troughs'}?farmId=${m.farmId}&id=${m.id}`),
      )
      popup.append(kind, heading, button)
      const marker = L.marker([m.latitude, m.longitude], {
        icon: markerIcons[animal ? 'animal' : 'trough'],
        title: `${animal ? 'Animal' : 'Bebedero'}: ${m.name}`,
        alt: m.name,
        riseOnHover: true,
      }).addTo(layer.current)
      marker.bindPopup(popup, { className: 'map-popup-shell' })
      marker.on('click', () => focusMarker(m))
      markers.current.set(markerKey(m), marker)
    }
  }, [query.data, navigate, showMap, resourceType, focusMarker])

  // Encuadre inicial: el límite del campo elegido (si hay) junto con sus ubicaciones.
  useEffect(() => {
    if (!map.current || query.data === undefined || centered.current === farmId) return
    const points = query.data.filter(m => valid(m) && (!resourceType || m.type === resourceType)).map((m) => [m.latitude, m.longitude])
    const outlines = JSON.parse(boundaryKey)
      .map(([id, name, latitude, longitude, areaHa]) => boundaryFor({ id, name, latitude, longitude, areaHa }, drawn, farmPositions(positionsKey)(id)))
      .filter(Boolean)
      .flatMap(b => b.points)
    const all = [...outlines, ...points]
    if (all.length) map.current.fitBounds(all, { paddingTopLeft: [40, 60], paddingBottomRight: [40, 40], maxZoom: 16, animate: false })
    else if (center && valid(center)) map.current.setView([center.latitude, center.longitude], 15, { animate: false })
    else map.current.setView([0, 0], 2, { animate: false })
    centered.current = farmId
  }, [farmId, center, query.data, showMap, resourceType, boundaryKey, positionsKey, drawn])

  return (
    <>
      {compact && <div className="flex gap-2 mb-4" role="group" aria-label="Vista de ubicaciones">
        {[[Map, 'map', 'Mapa'], [List, 'list', 'Lista']].map(([Icon, value, label]) => <button key={value} type="button" aria-pressed={view === value} className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 aria-pressed:bg-[#dcecdf] aria-pressed:text-[#153e26]" onClick={() => setView(value)}><Icon size={18} aria-hidden="true" />{label}</button>)}
      </div>}
      <AsyncState loading={query.isPending} error={query.error} onRetry={() => query.refetch()} />
      {query.stale && <p role="status">Sin conexión. Ubicaciones anteriores.</p>}
      {showMap && <div className="map-shell">
        <div
          ref={container}
          role="region"
          aria-label="Mapa de animales y bebederos"
          className="map-canvas"
          style={{ height: compact ? 300 : 440, width: '100%', position: 'relative', zIndex: 0 }}
        />
        <div className="map-base-toggle" role="group" aria-label="Tipo de mapa">
          {[['satellite', Satellite], ['streets', Map]].map(([value, Icon]) => (
            <button key={value} type="button" aria-pressed={base === value} onClick={() => chooseBase(value)}>
              <Icon size={16} aria-hidden="true" />{BASE_LAYERS[value].label}
            </button>
          ))}
        </div>
      </div>}
      {!query.denied && (!compact || view === 'list' || tileError) && <MapFallback markers={positions} tileError={tileError} compact={compact} onFocus={showMap ? m => focusMarker(m, { scroll: true }) : undefined} />}
    </>
  )
}
