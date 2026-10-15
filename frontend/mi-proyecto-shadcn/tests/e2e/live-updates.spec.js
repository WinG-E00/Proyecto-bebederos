import { test, expect } from '@playwright/test'
import { config, ownerSession, createFarm } from './monitoringHelpers.js'
import { submitSample } from '../../../../database/scripts/sample.js'
import { createMonitorWorker } from '../../../../database/workers/monitor.worker.js'
test.setTimeout(120000)
test.skip(!config, 'Requiere API real y MySQL de pruebas')

// SC-003 en la interfaz: agua, categoría, resumen y marcadores de una vista abierta se
// actualizan sin recarga dentro de 30 s desde que el dato queda disponible.
test('vista abierta refleja agua, resumen y GPS sin recargar en ≤30 s', async ({ page, request }, testInfo) => {
  await page.route('**/*.tile.openstreetmap.org/**', (route) => route.abort())
  const db = await ownerSession(page, request)
  try {
    const f = await createFarm(page, 'Campo en vivo')
    const { troughId, animalId } = await page.evaluate(async (farmId) => {
      const { csrfToken } = await (await fetch('/api/v1/auth/csrf')).json()
      const post = async (path, body) => (await (await fetch(`/api/v1${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(body) })).json()).id
      return {
        troughId: await post(`/farms/${farmId}/troughs`, { name: 'Bebedero en vivo', capacityLiters: 400, latitude: -26, longitude: -59 }),
        animalId: await post(`/farms/${farmId}/animals`, { name: 'Animal en vivo', species: 'Bovino', breed: 'Angus', ageYears: 3, state: 'Activo' }),
      }
    }, f.id)
    const worker = createMonitorWorker(db)
    const timings = {}

    await page.goto(`/troughs?farmId=${f.id}`)
    await expect(page.getByText('Sin medición').first()).toBeVisible()
    await submitSample(db, 'water', { resourceId: troughId, sourceKey: `live:${troughId}:1`, percentage: 64, measuredAt: new Date().toISOString() }, { environment: 'test' })
    await worker.process()
    let available = Date.now()
    await expect(page.getByText('Agua: 64% · Normal')).toBeVisible({ timeout: 30000 })
    timings.water = Date.now() - available

    await submitSample(db, 'water', { resourceId: troughId, sourceKey: `live:${troughId}:2`, percentage: 12, measuredAt: new Date().toISOString() }, { environment: 'test' })
    await worker.process()
    available = Date.now()
    await expect(page.getByText('Agua: 12% · Crítico')).toBeVisible({ timeout: 30000 })
    timings.category = Date.now() - available

    await page.goto(`/dashboard?farmId=${f.id}`)
    await expect(page.getByRole('link', { name: 'Agua Crítica 1', exact: true })).toBeVisible()
    await submitSample(db, 'water', { resourceId: troughId, sourceKey: `live:${troughId}:3`, percentage: 35, measuredAt: new Date().toISOString() }, { environment: 'test' })
    await worker.process()
    available = Date.now()
    await expect(page.getByRole('link', { name: 'Agua Baja 1', exact: true })).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole('link', { name: 'Agua Crítica 0', exact: true })).toBeVisible()
    timings.dashboard = Date.now() - available

    await page.goto(`/map?farmId=${f.id}`)
    // Esperar la primera consulta del mapa (solo el bebedero) antes de enviar el GPS.
    await expect(page.getByText(/Bebedero: Bebedero en vivo/).first()).toBeVisible()
    await expect(page.getByText(/Animal: Animal en vivo/)).toHaveCount(0)
    await submitSample(db, 'animalPosition', { resourceId: animalId, sourceKey: `live:${animalId}:1`, latitude: -26.01, longitude: -59.01, measuredAt: new Date().toISOString() }, { environment: 'test' })
    await worker.process()
    available = Date.now()
    await expect(page.getByText(/Animal: Animal en vivo/)).toBeVisible({ timeout: 30000 })
    timings.gps = Date.now() - available

    for (const [kind, ms] of Object.entries(timings)) {
      expect(ms, kind).toBeLessThanOrEqual(30000)
      testInfo.annotations.push({ type: `visible-ms:${kind}`, description: String(ms) })
    }
    console.log(`[${testInfo.project.name}] visible-ms ${JSON.stringify(timings)}`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  } finally { await db.close() }
})
