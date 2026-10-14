import { test, expect } from '@playwright/test'
import { config, ownerSession, createFarm } from './monitoringHelpers.js'
test.skip(!config, 'Requiere API real y MySQL de pruebas')
test('US2 crea, configura, confirma baja y valida entradas', async ({
  page,
  request,
}, testInfo) => {
  const db = await ownerSession(page, request)
  try {
    await createFarm(page)
    await expect(page.getByText('20 ha · 0 animales · 0 bebederos')).toBeVisible()
    await page.getByRole('button', { name: 'Editar', exact: true }).click()
    await page.getByLabel('Antigüedad máxima').fill('60')
    await page.getByRole('button', { name: 'Guardar establecimiento' }).click()
    await expect(page.getByText(/Antigüedad máxima: 60/)).toBeVisible()
    await page.getByRole('button', { name: 'Nuevo establecimiento' }).click()
    await page.getByLabel('Nombre', { exact: true }).fill('Inválido')
    await page.getByLabel('Latitud', { exact: true }).fill('91')
    await page.getByLabel('Longitud', { exact: true }).fill('-59')
    await page.getByLabel('Superficie (ha)').fill('-1')
    await page.getByRole('button', { name: 'Guardar establecimiento' }).click()
    await expect(page.getByLabel('Latitud', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await page.screenshot({ path: testInfo.outputPath('farms.png'), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Eliminar', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await expect(page.getByText('No hay establecimientos disponibles.')).toBeVisible()
  } finally {
    await db.close()
  }
})
