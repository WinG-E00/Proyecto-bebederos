import { useSyncExternalStore } from 'react'
import { limitesCampos } from '../data/limitesCampos.js'

// Límites dibujados en este navegador (sin base de datos): { [farmId]: [[lat, lng], ...] }.
const KEY = 'bebederos:limites-campos'
const listeners = new Set()
let drawn = read()

function read() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}
function commit(next) {
  drawn = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* Sin almacenamiento: el límite dura hasta recargar. */ }
  listeners.forEach(fn => fn())
}
function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function saveDrawnBoundary(farmId, points) {
  commit({ ...drawn, [farmId]: points.map(([lat, lng]) => [round(lat), round(lng)]) })
}
export function removeDrawnBoundary(farmId) {
  const next = { ...drawn }
  delete next[farmId]
  commit(next)
}
export function useDrawnBoundaries() {
  return useSyncExternalStore(subscribe, () => drawn, () => drawn)
}
const round = n => Math.round(n * 1e6) / 1e6

const M_PER_DEG_LAT = 111320
const validPoint = p => Number.isFinite(p?.latitude) && Number.isFinite(p?.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180

function rectangle(centerLat, centerLng, halfHeightM, halfWidthM) {
  const dLat = halfHeightM / M_PER_DEG_LAT
  const dLng = halfWidthM / (M_PER_DEG_LAT * Math.cos((centerLat * Math.PI) / 180))
  return [[centerLat + dLat, centerLng - dLng], [centerLat + dLat, centerLng + dLng], [centerLat - dLat, centerLng + dLng], [centerLat - dLat, centerLng - dLng]]
}

// Límite aproximado: un rectángulo que encierra todos los animales y bebederos del campo con margen,
// agrandado si hace falta hasta la superficie registrada. Sin ubicaciones, un cuadrado de esa superficie
// centrado en la ubicación del campo.
export function approximateBoundary(farm, positions = []) {
  const points = positions.filter(validPoint)
  const areaM2 = farm?.areaHa > 0 ? farm.areaHa * 10000 : 0
  if (!points.length) {
    if (!validPoint(farm) || !areaM2) return null
    const half = Math.sqrt(areaM2) / 2
    return rectangle(farm.latitude, farm.longitude, half, half)
  }
  const lats = points.map(p => p.latitude), lngs = points.map(p => p.longitude)
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const cos = Math.cos((centerLat * Math.PI) / 180)
  const spanHeight = (Math.max(...lats) - Math.min(...lats)) * M_PER_DEG_LAT
  const spanWidth = (Math.max(...lngs) - Math.min(...lngs)) * M_PER_DEG_LAT * cos
  // Margen: 15 % del tamaño o 60 m como mínimo, para que ningún marcador quede sobre la línea.
  let halfHeight = spanHeight / 2 + Math.max(60, spanHeight * 0.15)
  let halfWidth = spanWidth / 2 + Math.max(60, spanWidth * 0.15)
  const area = 4 * halfHeight * halfWidth
  if (areaM2 > area) {
    const scale = Math.sqrt(areaM2 / area)
    halfHeight *= scale
    halfWidth *= scale
  }
  return rectangle(centerLat, centerLng, halfHeight, halfWidth)
}

// Prioridad: dibujado en el navegador → fijo en el código → aproximado según ubicaciones y superficie.
export function boundaryFor(farm, drawnBoundaries, positions = []) {
  const id = String(farm.id)
  if (drawnBoundaries[id]?.length >= 3) return { points: drawnBoundaries[id], source: 'drawn' }
  if (limitesCampos[id]?.length >= 3) return { points: limitesCampos[id], source: 'fixed' }
  const points = approximateBoundary(farm, positions)
  return points ? { points, source: 'approx' } : null
}

// Cuántas ubicaciones quedan fuera de un límite (para avisar al dibujar).
export function pointsOutside(boundary, positions) {
  return positions.filter(validPoint).filter(p => !insidePolygon([p.latitude, p.longitude], boundary)).length
}
function insidePolygon([lat, lng], polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i], [yj, xj] = polygon[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function exportBoundaries(drawnBoundaries) {
  return JSON.stringify({ ...limitesCampos, ...drawnBoundaries }, null, 2)
}

// Superficie aproximada de un polígono en hectáreas (proyección local; suficiente para un campo).
export function polygonAreaHa(points) {
  if (!points || points.length < 3) return 0
  const lat0 = (points.reduce((sum, [lat]) => sum + lat, 0) / points.length) * Math.PI / 180
  const xy = points.map(([lat, lng]) => [lng * 111320 * Math.cos(lat0), lat * 110540])
  let twice = 0
  for (let i = 0; i < xy.length; i += 1) {
    const [x1, y1] = xy[i], [x2, y2] = xy[(i + 1) % xy.length]
    twice += x1 * y2 - x2 * y1
  }
  return Math.abs(twice) / 2 / 10000
}
