import { test, expect } from '@playwright/test'
import { config, ownerSession, createFarm } from './monitoringHelpers.js'
import { submitSample } from '../../../../database/scripts/sample.js'
import { createWaterProcessing } from '../../../../database/services/waterProcessing.service.js'
test.skip(!config, 'Requiere API real y MySQL de pruebas')
test('US3 alta, actualización automática y medición inmutable', async ({
  page,
  request,
}, testInfo) => {
  const db = await ownerSession(page, request)
  try {
    const f = await createFarm(page)
    await page.goto(`/troughs?farmId=${f.id}`)
    await page.getByRole('button', { name: 'Nuevo bebedero' }).click()
    await page.getByLabel('Nombre', { exact: true }).fill('Bebedero E2E')
    await page.getByLabel('Capacidad (litros)').fill('500')
    await page.getByLabel('Latitud administrativa').fill('-26')
    await page.getByLabel('Longitud administrativa').fill('-59')
    await page.getByRole('button', { name: 'Guardar bebedero' }).click()
    await expect(page.getByText('Agua: Sin medición')).toBeVisible()
    await expect(page.getByText('Sin datos recibidos')).toBeVisible()
    const [rows] = await db.query('SELECT id FROM Troughs WHERE farmId=:id', {
      replacements: { id: f.id },
    })
    const id = rows[0].id
    const now = new Date('2026-10-13T12:00:00Z')
    await submitSample(
      db,
      'water',
      {
        sourceKey: `e2e-water:${id}`,
        resourceId: id,
        percentage: 19,
        measuredAt: now.toISOString(),
      },
      { environment: 'test' },
    )
    await createWaterProcessing(db, { clock: { now: () => now } }).process()
    await expect(page.getByText('Agua: 19% · Crítico')).toBeVisible({ timeout: 20000 })
    await expect(page.locator('input')).toHaveCount(0)
    const denied = await page.evaluate(async (farmId) => {
      const { csrfToken } = await (await fetch('/api/v1/auth/csrf')).json()
      return (
        await fetch(`/api/v1/farms/${farmId}/troughs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify({ name: 'Prohibido', capacityLiters: 100, waterLevel: 0 }),
        })
      ).status
    }, f.id)
    expect(denied).toBe(422)
    await page.screenshot({ path: testInfo.outputPath('troughs.png'), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await expect(page.getByText('No hay bebederos disponibles.')).toBeVisible()
  } finally {
    await db.close()
  }
})
