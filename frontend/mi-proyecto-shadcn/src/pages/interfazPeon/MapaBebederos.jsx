import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMap } from '../../hooks/useMap.js'
import MapFallback from '../../components/MapFallback.jsx'
import AsyncState from '../../components/AsyncState.jsx'
const valid = (m) =>
  Number.isFinite(m.latitude) &&
  Number.isFinite(m.longitude) &&
  Math.abs(m.latitude) <= 90 &&
  Math.abs(m.longitude) <= 180
export default function MapaBebederos({ farmId = '', center }) {
  const query = useMap(farmId)
  const positions = (query.data ?? []).filter(valid)
  const container = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const centered = useRef(null)
  const [tileError, setTileError] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    const instance = L.map(container.current).setView([0, 0], 2)
    map.current = instance
    layer.current = L.layerGroup().addTo(instance)
    const tiles = L.tileLayer(
      import.meta.env.VITE_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      },
    ).addTo(instance)
    tiles.on('tileerror', () => setTileError(true))
    const observer = new ResizeObserver(() => instance.invalidateSize())
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      instance.remove()
      map.current = null
      layer.current = null
      centered.current = null
    }
  }, [])
  useEffect(() => {
    if (!layer.current) return
    layer.current.clearLayers()
    for (const m of (query.data ?? []).filter(valid)) {
      const popup = document.createElement('div')
      const heading = document.createElement('strong')
      heading.textContent = `${m.type === 'animal' ? 'Animal' : 'Bebedero'}: ${m.name}`
      const button = document.createElement('button')
      button.textContent = 'Abrir ficha'
      button.style.minHeight = '44px'
      button.addEventListener('click', () =>
        navigate(`/${m.type === 'animal' ? 'animals' : 'troughs'}?farmId=${m.farmId}&id=${m.id}`),
      )
      popup.append(heading, document.createElement('br'), button)
      const marker = L.marker([m.latitude, m.longitude], {
        icon: L.divIcon({
          className: '',
          html: `<span style="display:grid;place-items:center;border:2px solid white;border-radius:${m.type === 'animal' ? '50%' : '4px'};background:${m.type === 'animal' ? '#a65f24' : '#198754'};color:white;width:30px;height:30px;font-weight:bold">${m.type === 'animal' ? 'A' : 'B'}</span>`,
          iconSize: [30, 30],
        }),
        title: `${m.type === 'animal' ? 'Animal' : 'Bebedero'}: ${m.name}`,
        alt: m.name,
      }).addTo(layer.current)
      marker.bindPopup(popup)
    }
  }, [query.data, navigate])
  useEffect(() => {
    if (!map.current || query.data === undefined || centered.current === farmId) return
    if (center && valid(center)) {
      map.current.setView([center.latitude, center.longitude], 15)
    } else {
      const points = query.data.filter(valid).map((m) => [m.latitude, m.longitude])
      if (points.length) map.current.fitBounds(points, { padding: [35, 35], maxZoom: 15 })
      else map.current.setView([0, 0], 2)
    }
    centered.current = farmId
  }, [farmId, center, query.data])
  return (
    <>
      <AsyncState loading={query.isPending} error={query.error} onRetry={() => query.refetch()} />
      {query.stale && <p role="status">Sin conexión. Ubicaciones anteriores.</p>}
      <div
        ref={container}
        role="region"
        aria-label="Mapa de animales y bebederos"
        style={{ height: 400, width: '100%', position: 'relative', zIndex: 0 }}
      />
      {!query.denied && <MapFallback markers={positions} tileError={tileError} />}
    </>
  )
}
