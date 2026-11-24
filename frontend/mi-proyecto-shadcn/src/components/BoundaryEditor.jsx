import { useEffect, useState } from 'react'
import L from 'leaflet'
import { Check, ClipboardCopy, PencilLine, Trash2, Undo2, X } from 'lucide-react'
import { boundaryFor, exportBoundaries, pointsOutside, polygonAreaHa, removeDrawnBoundary, saveDrawnBoundary, useDrawnBoundaries } from '../lib/farmBoundaries.js'
import { useMap } from '../hooks/useMap.js'
import './BoundaryEditor.css'

const sourceText = {
  drawn: 'Dibujado en este navegador',
  fixed: 'Límite oficial cargado',
  approx: 'Aproximado: rodea todos los animales y bebederos del campo',
}
const ha = n => `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: n < 10 ? 1 : 0 }).format(n)} ha`

// Permite marcar el contorno real del campo tocando sus esquinas sobre la vista satelital.
export default function BoundaryEditor({ api, farm }) {
  const drawn = useDrawnBoundaries()
  const [drawing, setDrawing] = useState(false)
  const [points, setPoints] = useState([])
  const [message, setMessage] = useState('')
  const [exported, setExported] = useState('')
  const map = api?.map
  const locations = useMap(farm?.id ?? '').data ?? []
  const farmLocations = farm ? locations.filter(m => String(m.farmId) === String(farm.id)) : []
  const current = farm ? boundaryFor(farm, drawn, farmLocations) : null

  useEffect(() => {
    if (!map || !drawing) return
    const element = map.getContainer()
    element.classList.add('is-drawing')
    map.doubleClickZoom.disable()
    const onClick = event => setPoints(list => [...list, [event.latlng.lat, event.latlng.lng]])
    const onKey = event => { if (event.key === 'Escape') setDrawing(false) }
    map.on('click', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      map.off('click', onClick)
      document.removeEventListener('keydown', onKey)
      element.classList.remove('is-drawing')
      map.doubleClickZoom.enable()
    }
  }, [map, drawing])

  useEffect(() => {
    if (!map || !drawing) return
    const group = L.layerGroup().addTo(map)
    if (points.length >= 3) L.polygon(points, { color: '#ffffff', weight: 3, dashArray: '6 6', fillColor: '#ffd23f', fillOpacity: 0.18, interactive: false }).addTo(group)
    else if (points.length === 2) L.polyline(points, { color: '#ffffff', weight: 3, dashArray: '6 6', interactive: false }).addTo(group)
    points.forEach((point, index) => L.circleMarker(point, { radius: 7, color: '#ffffff', weight: 2.5, fillColor: index === 0 ? '#ffd23f' : '#246a48', fillOpacity: 1, interactive: false }).addTo(group))
    return () => group.remove()
  }, [map, drawing, points])

  if (!farm) return <section className="boundary-editor boundary-editor--hint" aria-label="Límite del campo">
    <PencilLine size={18} aria-hidden="true" /><p>Elegí un establecimiento para ver o dibujar su límite.</p>
  </section>

  function start() {
    api?.setBase('satellite')
    setPoints([])
    setMessage('')
    setDrawing(true)
  }
  function save() {
    saveDrawnBoundary(farm.id, points)
    setDrawing(false)
    setMessage(`Límite de ${farm.name} guardado en este navegador. Para que lo vean todos, tocá “Copiar límites” y enviáselo al equipo de desarrollo.`)
  }
  async function copy() {
    const text = exportBoundaries(drawn)
    try {
      await navigator.clipboard.writeText(text)
      setExported('')
      setMessage('Límites copiados. Pegalos en un mensaje para el equipo de desarrollo.')
    } catch {
      setExported(text)
      setMessage('No se pudo copiar automáticamente. Seleccioná el texto de abajo y copialo.')
    }
  }

  const drawnArea = polygonAreaHa(points)
  const outside = points.length >= 3 ? pointsOutside(points, farmLocations) : 0
  return <section className={`boundary-editor${drawing ? ' is-active' : ''}`} aria-label="Límite del campo">
    {drawing ? <>
      <div className="boundary-editor-copy">
        <strong>Dibujando el límite de {farm.name}</strong>
        <p>Tocá sobre el mapa cada esquina del campo, siguiendo el alambrado. Podés acercarte con la rueda o los botones + y −.</p>
        {outside > 0 && <p className="boundary-editor-warning">{outside === 1 ? '1 animal o bebedero queda fuera del límite.' : `${outside} animales o bebederos quedan fuera del límite.`} Revisá las esquinas.</p>}
        <p className="boundary-editor-count" role="status">{points.length} {points.length === 1 ? 'punto marcado' : 'puntos marcados'}{points.length >= 3 && ` · ≈ ${ha(drawnArea)}${farm.areaHa ? ` (registrado: ${ha(farm.areaHa)})` : ''}`}</p>
      </div>
      <div className="boundary-editor-actions">
        <button type="button" className="secondary-button min-h-11" disabled={!points.length} onClick={() => setPoints(list => list.slice(0, -1))}><Undo2 size={16} aria-hidden="true" />Deshacer punto</button>
        <button type="button" className="secondary-button min-h-11" onClick={() => setDrawing(false)}><X size={16} aria-hidden="true" />Cancelar</button>
        <button type="button" className="primary-button min-h-11" disabled={points.length < 3} onClick={save}><Check size={16} aria-hidden="true" />Guardar límite</button>
      </div>
    </> : <>
      <div className="boundary-editor-copy">
        <strong>Límite de {farm.name}</strong>
        <p>{current ? sourceText[current.source] : 'Sin datos de ubicación o superficie para calcularlo.'}{current && ` · ≈ ${ha(polygonAreaHa(current.points))}`}</p>
      </div>
      <div className="boundary-editor-actions">
        <button type="button" className="primary-button min-h-11" onClick={start}><PencilLine size={16} aria-hidden="true" />{current?.source === 'drawn' ? 'Volver a dibujar' : 'Dibujar límite real'}</button>
        {current?.source === 'drawn' && <button type="button" className="danger-ghost min-h-11" onClick={() => { removeDrawnBoundary(farm.id); setMessage('Se borró el límite dibujado.') }}><Trash2 size={16} aria-hidden="true" />Borrar dibujo</button>}
        {Object.keys(drawn).length > 0 && <button type="button" className="secondary-button min-h-11" onClick={copy}><ClipboardCopy size={16} aria-hidden="true" />Copiar límites</button>}
      </div>
    </>}
    {message && <p className="boundary-editor-message" role="status">{message}</p>}
    {exported && <textarea className="boundary-editor-export" readOnly value={exported} aria-label="Límites para copiar" onFocus={e => e.target.select()} />}
  </section>
}
