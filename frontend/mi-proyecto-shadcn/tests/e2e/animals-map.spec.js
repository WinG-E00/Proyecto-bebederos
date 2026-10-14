import { test, expect } from '@playwright/test'
import { config, ownerSession, createFarm } from './monitoringHelpers.js'
import { submitSample } from '../../../../database/scripts/sample.js'
import { createMonitorWorker } from '../../../../database/workers/monitor.worker.js'
test.setTimeout(60000)
test.skip(!config, 'Requiere API real y MySQL de pruebas')
test('US4 animal, visita estimada, mapa táctil y alternativa sin teselas', async ({
  page,
  request,
}, testInfo) => {
  const db = await ownerSession(page, request)
  try {
    const f = await createFarm(page)
    await page.goto(`/troughs?farmId=${f.id}`)
    await page.getByRole('button', { name: 'Nuevo bebedero' }).click()
    await page.getByLabel('Nombre', { exact: true }).fill('Bebedero mapa')
    await page.getByLabel('Capacidad (litros)').fill('500')
    await page.getByLabel('Latitud administrativa').fill('-26')
    await page.getByLabel('Longitud administrativa').fill('-59')
    await page.getByRole('button', { name: 'Guardar bebedero' }).click()
    await expect(page.getByRole('heading', { name: 'Bebedero mapa' })).toBeVisible()
    await page.goto(`/animals?farmId=${f.id}`)
    await page.getByRole('button', { name: 'Nuevo animal' }).click()
    await page.getByLabel('Identificación individual').fill('Animal E2E')
    await page.getByLabel('Especie').fill('Bovino')
    await page.getByLabel('Raza').fill('Angus')
    await page.getByLabel('Edad (años)').fill('2')
    await page.getByLabel('Estado administrativo').fill('Activo')
    await page.getByRole('button', { name: 'Guardar animal' }).click()
    await expect(page.getByText('GPS: Sin ubicación recibida')).toBeVisible()
    await expect(page.getByText('Sin visitas registradas')).toBeVisible()
    const [rows] = await db.query('SELECT id FROM Animals WHERE farmId=:id', {
      replacements: { id: f.id },
    })
    const id = rows[0].id
    const now = new Date('2026-10-13T12:00Z')
    await submitSample(
      db,
      'animalPosition',
      {
        sourceKey: `e2e-animal:${id}`,
        resourceId: id,
        latitude: -26,
        longitude: -59,
        measuredAt: now.toISOString(),
      },
      { environment: 'test' },
    )
    await createMonitorWorker(db, { clock: { now: () => now } }).process()
    await expect(page.getByText(/Visita estimada por proximidad/)).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('GPS: -26, -59')).toBeVisible()
    await page.getByRole('button', { name: 'Editar', exact: true }).click()
    await page.getByLabel('Edad (años)').fill('3')
    await page.getByRole('button', { name: 'Guardar animal' }).click()
    await expect(page.getByText('Bovino · Angus · 3 años · Activo')).toBeVisible()
    await page.route('**/*.tile.openstreetmap.org/**', (route) => route.abort())
    await page.goto(`/map?farmId=${f.id}`)
    await expect(page.getByRole('region', { name: 'Mapa de animales y bebederos' })).toBeVisible()
    await expect(page.getByText(/No se pudo cargar el mapa base/)).toBeVisible()
    await expect(page.getByRole('link', { name: /Animal: Animal E2E/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Bebedero: Bebedero mapa/ })).toBeVisible()
    const animalMarker = page.locator('.leaflet-marker-icon[title="Animal: Animal E2E"]')
    await animalMarker.click()
    await page.getByRole('button', { name: 'Abrir ficha' }).click()
    await expect(page.getByRole('heading', { name: 'Animal E2E', exact: true })).toBeVisible()
    await page.goto(`/map?farmId=${f.id}`)
    await expect(animalMarker).toBeVisible()
    await page.locator('.leaflet-control-zoom-in').click()
    const before = await page.locator('.leaflet-map-pane').getAttribute('style')
    const markerBefore = await animalMarker.getAttribute('style')
    const moved = new Date(+now + 1000)
    await submitSample(
      db,
      'animalPosition',
      {
        sourceKey: `e2e-moved:${id}`,
        resourceId: id,
        latitude: -26.00001,
        longitude: -59,
        measuredAt: moved.toISOString(),
      },
      { environment: 'test' },
    )
    await createMonitorWorker(db, { clock: { now: () => moved } }).process()
    await expect(animalMarker).not.toHaveAttribute('style', markerBefore, { timeout: 20000 })
    expect(await page.locator('.leaflet-map-pane').getAttribute('style')).toBe(before)
    await page.screenshot({ path: testInfo.outputPath('animals-map.png'), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('link', { name: /Animal: Animal E2E/ }).click()
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await expect(page.getByText('Ya no tenés acceso a estos datos.')).toBeVisible()
  } finally {
    await db.close()
  }
})
