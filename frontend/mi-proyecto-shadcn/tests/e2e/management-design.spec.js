import { test, expect } from '@playwright/test'
import { prepareBaselinePage } from './helpers.js'

const farms = [{ id: 1, name: 'Los Álamos', description: 'Cría y recría bovina sobre pasturas naturales.', areaHa: 1240, animalCount: 2, troughCount: 3, latitude: -37.15, longitude: -58.48, timezone: 'America/Argentina/Buenos_Aires', staleMinutes: 180 }]
const troughs = [
  { id: 1, farmId: 1, name: 'Bebedero Norte', capacityLiters: 500, operationalState: 'Operativo', waterLevel: 100, waterCategory: 'Normal', freshness: 'fresh', lastUpdatedAt: '2026-10-13T11:42:00Z', latitude: -37.15, longitude: -58.48, locationSource: 'device' },
  { id: 2, farmId: 1, name: 'Corral principal', capacityLiters: 800, operationalState: 'En mantenimiento', waterLevel: 18, waterCategory: 'Crítico', freshness: 'stale', lastUpdatedAt: '2026-10-12T11:42:00Z', latitude: -37.151, longitude: -58.481, locationSource: 'administrative' },
  { id: 3, farmId: 1, name: 'Potrero Sur', capacityLiters: 1000, operationalState: 'Fuera de servicio', waterLevel: null, waterCategory: null, freshness: 'missing', latitude: null, longitude: null, locationSource: 'administrative' },
]
const animals = [
  { id: 1, farmId: 1, name: 'A01-001', species: 'Bovino', breed: 'Angus', ageYears: 2, state: 'Activo', freshness: 'fresh', position: { latitude: -37.152, longitude: -58.482, measuredAt: '2026-10-13T11:42:00Z' }, lastVisit: { troughName: 'Bebedero Norte', visitedAt: '2026-10-13T11:00:00Z' } },
  { id: 2, farmId: 1, name: 'A01-002', species: 'Bovino', breed: 'Hereford', ageYears: 1, state: 'Activo', freshness: 'missing', position: null, lastVisit: null },
]
const activity = [
  { id: 1, title: 'Revisar flotante del bebedero norte', workerName: 'Martín Acosta', state: 'En progreso', deadline: '2026-10-13T18:00:00Z' },
  { id: 2, title: 'Limpiar tanque australiano', workerName: 'Sofía Paz', state: 'Pendiente de validación' },
]
async function fixture(page, role = 'owner') {
  const writes = []
  await prepareBaselinePage(page)
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/v1', '')
    const empty = { items: [], total: 0, limit: 20, page: 1 }
    let body = empty
    if (!['GET', 'HEAD'].includes(route.request().method()) && path !== '/auth/csrf') {
      writes.push({ path, method: route.request().method(), body: route.request().postDataJSON() })
      if (route.request().method() === 'DELETE') return route.fulfill({ status: 409, json: { code: 'RESOURCE_IN_USE', message: 'No se puede retirar: hay tareas abiertas.' } })
      return route.fulfill({ json: { id: 9 } })
    }
    if (path === '/auth/me') body = { account: { id: 1, name: 'Juan Rodríguez', role } }
    if (path === '/auth/csrf') body = { csrfToken: 'management-test' }
    if (path === '/farms') body = { ...empty, total: farms.length, items: farms }
    if (path === '/dashboard') body = { farms: 1, troughs: 3, animals: 2, workers: 2, activeAlerts: 1, water: { critical: 1, low: 0, missing: 1 }, tasks: { total: 2, pending: 0, inProgress: 1, validation: 1 } }
    if (path === '/alerts') body = { ...empty, total: 1, items: [{ id: 1, message: 'Agua crítica en Corral principal' }] }
    if (path === '/tasks') body = { ...empty, items: activity, total: 2 }
    if (path === '/troughs') body = { ...empty, items: troughs, total: 23 }
    if (path === '/troughs/1') body = troughs[0]
    if (path === '/animals') body = { ...empty, items: animals, total: 22 }
    if (path === '/animals/1') body = animals[0]
    if (path === '/map') body = [
      ...troughs.filter(t => t.latitude != null).map(t => ({ ...t, type: 'trough' })),
      ...animals.filter(a => a.position).map(a => ({ id: a.id, farmId: a.farmId, name: a.name, type: 'animal', ...a.position })),
    ]
    if (path === '/farms/1/weather') body = { temperatureC: 24, condition: 'Parcialmente nublado', humidityPercent: 68, rainProbabilityPercent: 20, observedAt: '2026-10-13T11:42:00Z', timezone: farms[0].timezone }
    await route.fulfill({ json: body })
  })
  return writes
}

test('diseño conectado: cuatro pantallas, mapas por tipo, filtros, paginación y tema', async ({ page }, testInfo) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await fixture(page)
  for (const [path, title] of [['dashboard', 'Panel del campo'], ['farms', 'Establecimientos'], ['troughs', 'Bebederos'], ['animals', 'Animales']]) {
    await page.goto(`/${path}?farmId=1`)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    if (path === 'dashboard') {
      await expect(page.getByText('Agua crítica en Corral principal', { exact: true })).toBeVisible()
      await expect(page.getByText('Parcialmente nublado', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Por validar', exact: false }).click()
      await expect(page.getByRole('link', { name: /Limpiar tanque/ })).toBeVisible()
      await expect(page.getByRole('link', { name: /Revisar flotante/ })).toHaveCount(0)
      await page.getByRole('button', { name: 'Abiertas', exact: false }).click()
    }
    if (path === 'farms') {
      await expect(page.getByRole('heading', { name: 'Los Álamos', exact: true })).toBeVisible()
      await page.getByText('Configuración técnica', { exact: true }).click()
      await expect(page.getByText(farms[0].timezone, { exact: true })).toBeVisible()
      await page.getByLabel('Buscar establecimiento').fill('inexistente')
      await expect(page.getByRole('heading', { name: 'No encontramos establecimientos' })).toBeVisible()
      await page.getByLabel('Buscar establecimiento').fill('')
    }
    if (path === 'troughs' || path === 'animals') {
      await page.getByRole('button', { name: 'Lista', exact: true }).click()
      const mapList = page.locator('.management-map')
      await expect(mapList.getByRole('link', { name: path === 'troughs' ? 'Bebedero: Bebedero Norte' : 'Animal: A01-001', exact: true })).toBeVisible()
      await expect(mapList.getByRole('link', { name: path === 'troughs' ? /^Animal:/ : /^Bebedero:/ })).toHaveCount(0)
      await page.getByRole('button', { name: 'Mapa', exact: true }).click()
      const search = page.getByLabel(path === 'troughs' ? 'Buscar bebedero' : 'Buscar identificación o raza')
      await search.fill('inexistente')
      await expect(page.getByRole('heading', { name: path === 'troughs' ? 'No encontramos bebederos' : 'No encontramos animales', exact: true })).toBeVisible()
      await search.fill('')
      await expect(page.getByText('Página 1', { exact: true })).toBeVisible()
      if (path === 'troughs') {
        await expect(page.locator('.water-average > strong')).toHaveText('100%')
        await expect(page.getByText('Sin medición', { exact: true })).toBeVisible()
        await expect(page.getByText(/Datos desactualizados/)).toBeVisible()
      } else {
        await expect(page.getByText('Sin ubicación recibida', { exact: true })).toBeVisible()
        await expect(page.getByText('Sin visitas registradas', { exact: true })).toBeVisible()
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: testInfo.outputPath(`${path}.png`), fullPage: true })
  }
  await page.goto('/dashboard?farmId=1')
  await page.getByRole('button', { name: 'Activar modo oscuro' }).click()
  await expect(page.locator('main.management-ui')).toHaveClass(/management-ui--dark/)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('dashboard-dark.png'), fullPage: true })
  await page.getByRole('button', { name: 'Activar modo claro' }).click()
  expect(errors).toEqual([])
})

test('formularios conservan parámetros y errores de API; eliminación exige confirmación', async ({ page }, testInfo) => {
  const writes = await fixture(page)
  await page.goto('/farms?farmId=1')
  await page.getByRole('button', { name: 'Nuevo establecimiento', exact: true }).click()
  let dialog = page.getByRole('dialog', { name: 'Crear establecimiento', exact: true })
  await expect(dialog.getByLabel('Antigüedad máxima (minutos)')).toHaveValue('180')
  await expect(dialog.getByLabel('Zona horaria IANA')).toHaveValue(farms[0].timezone)
  await dialog.getByLabel('Nombre', { exact: true }).fill('Campo nuevo')
  await dialog.getByLabel('Latitud', { exact: true }).fill('-26')
  await dialog.getByLabel('Longitud', { exact: true }).fill('-59')
  await dialog.getByLabel('Superficie (ha)').fill('20')
  await page.screenshot({ path: testInfo.outputPath('farm-form.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Guardar establecimiento' }).click()
  await expect(dialog).toHaveCount(0)
  expect(writes.at(-1)).toEqual({ path: '/farms', method: 'POST', body: { name: 'Campo nuevo', latitude: -26, longitude: -59, areaHa: 20, description: '', staleMinutes: 180, timezone: farms[0].timezone } })
  await page.goto('/troughs?farmId=1')
  await page.getByRole('button', { name: 'Nuevo bebedero', exact: true }).click()
  dialog = page.getByRole('dialog', { name: 'Nuevo bebedero', exact: true })
  await expect(dialog.getByLabel('Nombre')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Nuevo bebedero', exact: true })).toBeFocused()
  await page.goto('/animals?farmId=1')
  await page.locator('.trough-card').first().getByRole('button', { name: 'Editar', exact: true }).click()
  dialog = page.getByRole('dialog', { name: 'Editar A01-001', exact: true })
  await expect(dialog.getByLabel('Especie', { exact: true })).toHaveValue('Bovino')
  await dialog.getByLabel('Especie', { exact: true }).fill('Otra especie')
  await dialog.getByRole('button', { name: 'Guardar animal' }).click()
  await expect(dialog).toHaveCount(0)
  expect(writes.at(-1)).toEqual({ path: '/animals/1', method: 'PATCH', body: { name: 'A01-001', species: 'Otra especie', breed: 'Angus', ageYears: 2, state: 'Activo' } })
  await page.locator('.trough-card').first().getByRole('button', { name: 'Eliminar', exact: true }).click()
  dialog = page.getByRole('dialog', { name: 'Eliminar animal', exact: true })
  await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused()
  await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveText('No se puede retirar: hay tareas abiertas.')
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A01-001', exact: true })).toBeVisible()
})

test('peón conserva consulta y antecedentes sin acciones administrativas', async ({ page }) => {
  await fixture(page, 'worker')
  for (const path of ['farms', 'troughs', 'animals']) {
    await page.goto(`/${path}?farmId=1`)
    await expect(page.getByRole('heading', { name: path === 'farms' ? 'Los Álamos' : path === 'troughs' ? 'Bebedero Norte' : 'A01-001', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Nuevo|Editar|Eliminar/ })).toHaveCount(0)
    if (path !== 'farms') await expect(page.getByRole('button', { name: 'Ver antecedentes', exact: true }).first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
