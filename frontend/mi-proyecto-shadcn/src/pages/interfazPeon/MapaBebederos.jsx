import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

function MapaBebederos({ bebederos }) {
  const container = useRef(null)
  const map = useRef(null)
  const markers = useRef(null)
  const [tileError, setTileError] = useState(false)

  useEffect(() => {
    const instance = L.map(container.current).setView([-26.225179, -58.96781], 12)
    map.current = instance
    markers.current = L.layerGroup().addTo(instance)
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(instance)
    tiles.on('tileerror', () => setTileError(true))
    const observer = new ResizeObserver(() => instance.invalidateSize())
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      instance.remove()
      map.current = null
      markers.current = null
    }
  }, [])

  useEffect(() => {
    const layer = markers.current
    if (!layer || !map.current) return
    layer.clearLayers()
    const positions = []
    bebederos.forEach((bebedero) => {
      if (!Number.isFinite(bebedero.lat) || !Number.isFinite(bebedero.lng) || Math.abs(bebedero.lat) > 90 || Math.abs(bebedero.lng) > 180) return
      const position = [bebedero.lat, bebedero.lng]
      positions.push(position)
      const popup = document.createElement('div')
      const heading = document.createElement('strong')
      heading.textContent = `${bebedero.ubicacion || 'Bebedero'} · #${bebedero.id}`
      const detail = document.createElement('p')
      detail.textContent = `Nivel de agua: ${Number.isFinite(bebedero.porcentaje) ? `${bebedero.porcentaje}%` : 'Sin medición'} · Temperatura: ${Number.isFinite(bebedero.temperatura) ? `${bebedero.temperatura} °C` : 'Sin medición'}`
      popup.append(heading, detail)
      L.circleMarker(position, { radius: 9, color: '#fff', weight: 2, fillColor: '#198754', fillOpacity: 1 }).addTo(layer).bindPopup(popup)
    })
    if (positions.length === 1) map.current.setView(positions[0], 15)
    if (positions.length > 1) map.current.fitBounds(positions, { padding: [35, 35], maxZoom: 15 })
  }, [bebederos])

  return <>
    <div className="interfaz-peon__map" ref={container} role="region" aria-label="Mapa de ubicación de los bebederos" />
    {tileError && <p role="status">No se pudo cargar el mapa base. Verificá tu conexión a internet.</p>}
    {!bebederos.some((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng) && Math.abs(b.lat) <= 90 && Math.abs(b.lng) <= 180) && <p>No hay ubicaciones disponibles para mostrar.</p>}
  </>
}

export default MapaBebederos
