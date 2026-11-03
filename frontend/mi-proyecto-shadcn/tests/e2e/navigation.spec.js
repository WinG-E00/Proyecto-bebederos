import { test, expect } from '@playwright/test'
import { prepareBaselinePage } from './helpers.js'

async function mockSession(page, role) {
  let authenticated = true
  await prepareBaselinePage(page)
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    const empty = { items: [], total: 0, limit: 20, page: 1 }
    let body = empty
    if (path === '/auth/logout') {
      authenticated = false
      return route.fulfill({ status: 204 })
    }
    if (path === '/auth/me') {
      if (!authenticated) return route.fulfill({ status: 401, json: { code: 'UNAUTHENTICATED' } })
      body = { account: { id: 1, name: 'Ana Rodríguez', email: 'ana@test.invalid', role } }
    }
    if (path === '/auth/csrf') body = { csrfToken: 'test-navigation' }
    if (path === '/farms') body = { ...empty, total: 1, items: [{ id: 1, name: 'Campo Norte', latitude: -26, longitude: -59, areaHa: 240, animalCount: 0, troughCount: 0, staleMinutes: 180, timezone: 'America/Argentina/Buenos_Aires' }] }
    if (path === '/dashboard') body = { farms: 1, troughs: 0, animals: 0, workers: 0, activeAlerts: 0, water: { critical: 0, low: 0, missing: 0 }, tasks: { total: 0, pending: 0, inProgress: 0, validation: 0 } }
    if (path === '/map') body = []
    if (path === '/farms/1/weather') body = { unavailable: true }
    await route.fulfill({ json: body })
  })
}

async function openNavigation(page) {
  const opener = page.getByRole('button', { name: 'Abrir menú', exact: true })
  if (await opener.isVisible() && await opener.getAttribute('aria-expanded') === 'false') {
    await opener.click()
    await expect(page.locator('.app-nav-sidebar')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)')
  }
}

const commonRoutes = [
  ['Establecimientos', '/farms', 'Establecimientos'],
  ['Bebederos', '/troughs', 'Bebederos'],
  ['Animales', '/animals', 'Animales'],
  ['Mapa', '/map', 'Mapa'],
  ['Tareas', '/tasks', 'Tareas'],
  ['Alertas', '/alerts', 'Alertas y notificaciones'],
  ['Clima', '/weather', 'Clima por establecimiento'],
]

for (const role of ['owner', 'worker']) {
  test(`navegación ${role}: destinos reales, campo conservado y permisos`, async ({ page }, testInfo) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await mockSession(page, role)
    await page.goto('/dashboard?farmId=1')
    await expect(page.getByRole('heading', { name: role === 'owner' ? 'Panel del campo' : 'Monitoreo de Bebederos', exact: true })).toBeVisible()
    await expect(page.getByLabel('Establecimiento', { exact: true })).toHaveValue('1')
    await page.screenshot({ path: testInfo.outputPath(`layout-${role}.png`), fullPage: true })
    await openNavigation(page)
    const nav = page.getByRole('navigation', { name: 'Navegación principal' })
    if (role === 'worker') {
      await expect(nav.getByRole('link', { name: 'Equipo', exact: true })).toHaveCount(0)
      await expect(nav.getByRole('link', { name: 'Historial', exact: true })).toHaveCount(0)
    }
    await page.screenshot({ path: testInfo.outputPath(`navigation-${role}.png`), fullPage: true })
    const routes = role === 'owner' ? [...commonRoutes, ['Equipo', '/team', 'Equipo'], ['Historial', '/history', 'Historial']] : commonRoutes
    for (const [label, path, title] of routes) {
      await openNavigation(page)
      await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', `${path}?farmId=1`)
      await nav.getByRole('link', { name: label, exact: true }).click()
      await expect(page).toHaveURL(`${path}?farmId=1`)
      await expect(page.getByRole('heading', { name: role === 'worker' && path === '/tasks' ? 'Mis tareas' : title, exact: true })).toBeVisible()
      await expect(page.locator('.app-nav-item[aria-current="page"]')).toHaveAttribute('href', `${path}?farmId=1`)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    await openNavigation(page)
    await page.getByRole('link', { name: 'Mi perfil', exact: true }).click()
    await expect(page).toHaveURL('/profile?farmId=1')
    await expect(page.getByRole('heading', { name: 'Mi perfil', exact: true })).toBeVisible()
    await expect(page.locator('.app-nav-profile-link')).toHaveAttribute('aria-current', 'page')
    // Volver al panel desde la marca conserva también el campo seleccionado.
    await openNavigation(page)
    await page.getByRole('link', { name: 'Proyecto Bebederos, inicio', exact: true }).first().click()
    await expect(page).toHaveURL('/dashboard?farmId=1')
    await page.getByRole('link', { name: 'Notificaciones', exact: true }).click()
    await expect(page).toHaveURL('/alerts?farmId=1')
    await page.getByLabel('Establecimiento', { exact: true }).selectOption('')
    await openNavigation(page)
    await nav.getByRole('link', { name: 'Panel', exact: true }).click()
    await expect(page).toHaveURL('/dashboard')
    await openNavigation(page)
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible()
    expect(errors).toEqual([])
  })
}

test('menú móvil: foco, Escape, cierre al navegar y cambio a escritorio', async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.viewport.width > 760, 'Interacción del menú móvil')
  await mockSession(page, 'owner')
  await page.goto('/dashboard?farmId=1')
  const opener = page.getByRole('button', { name: 'Abrir menú', exact: true })
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeHidden()
  await opener.click()
  const menu = page.getByRole('dialog', { name: 'Menú de la aplicación' })
  await expect(menu).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cerrar menú', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(menu.getByRole('link', { name: 'Proyecto Bebederos, inicio' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(opener).toBeFocused()
  await opener.click()
  await page.getByRole('navigation').getByRole('link', { name: 'Animales', exact: true }).click()
  await expect(page).toHaveURL('/animals?farmId=1')
  await expect(page.getByRole('navigation')).toBeHidden()
  await expect(page.locator('.app-workspace')).not.toHaveAttribute('inert')
  await opener.click()
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(page.getByRole('dialog', { name: 'Menú de la aplicación' })).toHaveCount(0)
  await expect(page.getByRole('navigation')).toBeVisible()
  await expect(page.locator('.app-workspace')).not.toHaveAttribute('inert')
  await page.setViewportSize({ width: 360, height: 640 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await opener.click()
  await expect(page.getByRole('button', { name: 'Cerrar menú', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Cerrar menú de navegación', exact: true }).click({ position: { x: 350, y: 300 } })
  await expect(page.getByRole('dialog', { name: 'Menú de la aplicación' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
