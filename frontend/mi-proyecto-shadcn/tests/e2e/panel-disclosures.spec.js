import { test, expect } from '@playwright/test'
import { prepareBaselinePage } from './helpers.js'

for (const role of ['owner', 'worker']) {
 test(`panel ${role}: urgencias visibles y detalles a demanda`, async ({ page }, testInfo) => {
  const errors = []
  const calls = []
  page.on('pageerror', e => errors.push(e.message))
  await prepareBaselinePage(page)
  await page.route('**/api/v1/**', async route => {
   const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
   calls.push(path)
   const items = { items: [], total: 0, limit: 20, page: 1 }
   let body = items
   if (path === '/auth/me') body = { account: { id: 1, name: 'Usuario de prueba', role } }
   if (path === '/auth/csrf') body = { csrfToken: 'test' }
   if (path === '/farms') body = { ...items, total: 1, items: [{ id: 1, name: 'Campo Norte', latitude: -26, longitude: -59 }] }
   if (path === '/dashboard') body = { farms: 1, troughs: 12, animals: 4, workers: 1, activeAlerts: 1, water: { critical: 1, low: 0, missing: 0 }, tasks: { total: 2, pending: 2, inProgress: 0, validation: 0 } }
   if (path === '/alerts') body = { ...items, total: 1, items: [{ id: 1, message: 'Agua crítica en Corral Norte' }] }
   if (path === '/map') body = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, farmId: 1, name: `Corral ${i + 1}`, type: i === 0 ? 'animal' : 'trough', latitude: -26, longitude: -59 }))
   if (path === '/farms/1/weather') body = { temperatureC: 23, condition: 'Despejado', humidityPercent: 60, rainProbabilityPercent: 15, observedAt: '2026-10-13T12:00:00Z', timezone: 'America/Argentina/Buenos_Aires' }
   await route.fulfill({ json: body })
  })
  await page.goto('/dashboard?farmId=1')
  await expect(page.getByRole('heading', { name: 'Necesita atención' })).toBeVisible()
  await expect(page.getByText('Agua crítica en Corral Norte', { exact: true })).toBeVisible()
  for (const button of await page.locator('.panel-section__toggle').all()) await expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(calls).not.toContain('/map')
  expect(calls).not.toContain('/farms/1/weather')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath(`panel-${role}-closed.png`), fullPage: true })
  const climate = page.getByRole('button', { name: /^Clima/ })
  await climate.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText('23 °C · Despejado')).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByText('23 °C · Despejado')).toHaveCount(0)
  await page.getByRole('button', { name: /^Ubicaciones/ }).click()
  await expect(page.getByRole('region', { name: 'Mapa de animales y bebederos' })).toBeVisible()
  await page.getByRole('button', { name: 'Lista', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Animal: Corral 1', exact: true })).toBeVisible()
  await expect(page.getByText('Página 1 de 2')).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente' }).click()
  await expect(page.getByRole('link', { name: 'Bebedero: Corral 12', exact: true })).toBeVisible()
  await page.getByLabel('Tipo', { exact: true }).selectOption('animal')
  await expect(page.getByRole('link', { name: 'Animal: Corral 1', exact: true })).toBeVisible()
  await page.getByLabel('Buscar ubicación').fill('inexistente')
  await expect(page.getByText(/No hay coincidencias/)).toBeVisible()
  await page.getByRole('button', { name: 'Mapa', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Mapa de animales y bebederos' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath(`panel-${role}-map.png`), fullPage: true })
  expect(errors).toEqual([])
 })
}
