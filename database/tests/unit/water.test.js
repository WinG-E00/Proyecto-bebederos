import { it, expect } from 'vitest'
import { waterCategory, freshness, isNewerSample } from '../../services/water.service.js'
it.each([
  [0, 'Crítico'],
  [19, 'Crítico'],
  [20, 'Bajo'],
  [50, 'Bajo'],
  [51, 'Normal'],
  [100, 'Normal'],
  [-1, null],
  [101, null],
  [null, null],
  [NaN, null],
])('categoría %s', (n, c) => expect(waterCategory(n)).toBe(c))
it('ausencia nunca cero; antigüedad estricta y orden por fecha/id', () => {
  const now = new Date('2026-10-13T12:00Z')
  expect(freshness(null, 180, now)).toBe('missing')
  expect(freshness(new Date(now - 180 * 60000), 180, now)).toBe('fresh')
  expect(freshness(new Date(now - 180 * 60000 - 1), 180, now)).toBe('stale')
  const current = { id: 1, measuredAt: now, percentage: 20 }
  expect(isNewerSample({ ...current, id: 2 }, current)).toBe(true)
  expect(isNewerSample({ ...current, id: 3, measuredAt: new Date(now - 1) }, current)).toBe(false)
})
