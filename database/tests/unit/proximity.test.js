import { it, expect } from 'vitest'
import { haversine, nearestTrough, entryVisit } from '../../services/proximity.service.js'
const origin = { latitude: 0, longitude: 0 }
const north = (meters) => ({ latitude: ((meters / 6371000) * 180) / Math.PI, longitude: 0 })
it('Haversine, límite inclusivo 5m y exclusión fuera de rango', () => {
  expect(haversine(origin, north(5))).toBeCloseTo(5, 10)
  expect(nearestTrough(north(5), [{ id: 1, ...origin }])?.id).toBe(1)
  expect(nearestTrough(north(5.001), [{ id: 1, ...origin }])).toBeNull()
})
it('selecciona más cercano y desempata por id; sin ubicación no hay marcador', () => {
  expect(
    nearestTrough(origin, [
      { id: 2, ...origin },
      { id: 1, ...origin },
    ])?.id,
  ).toBe(1)
  expect(
    nearestTrough(origin, [
      { id: 2, ...north(1) },
      { id: 1, ...north(2) },
    ])?.id,
  ).toBe(2)
  expect(nearestTrough(origin, [{ id: 1, latitude: null, longitude: null }])).toBeNull()
})
it('primera entrada, permanencia, salida y reentrada', () => {
  expect(entryVisit(null, 1)).toBe(true)
  expect(entryVisit(1, 1)).toBe(false)
  expect(entryVisit(1, null)).toBe(false)
  expect(entryVisit(null, 1)).toBe(true)
  expect(entryVisit(1, 2)).toBe(true)
})
