import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { config, ownerSession, createFarm } from './monitoringHelpers.js'
import { insertAccount } from '../../../../database/tests/helpers/identityFixtures.js'
import { fixtureInsert } from '../../../../database/tests/helpers/monitoringFixtures.js'
import { submitSample } from '../../../../database/scripts/sample.js'
import { createMonitorWorker } from '../../../../database/workers/monitor.worker.js'
test.setTimeout(240000)
test.skip(!config, 'Requiere API real y MySQL de pruebas')

const OWNER_SCREENS = ['/dashboard', '/farms', '/troughs', '/animals', '/map', '/tasks', '/alerts', '/weather', '/team', '/history', '/profile']
const WORKER_SCREENS = ['/dashboard', '/farms', '/troughs', '/animals', '/map', '/tasks', '/alerts', '/weather', '/profile']

// Revisión automática de cada pantalla: sin scroll horizontal global, controles principales
// de al menos 44 px, nombre accesible en controles e imágenes y foco visible con teclado.
async function audit(page, path) {
  return page.evaluate((path) => {
    const problems = []
    if (document.documentElement.scrollWidth > innerWidth + 1) problems.push(`${path}: scroll horizontal (${document.documentElement.scrollWidth}px > ${innerWidth}px)`)
    const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' }
    const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent || el.labels?.[0]?.textContent || el.getAttribute('title') || el.textContent || el.getAttribute('alt') || '').trim()
    const describe = (el) => `${el.tagName.toLowerCase()}${el.type ? `[${el.type}]` : ''} «${name(el).slice(0, 40)}»`
    // Controles principales: botones, campos y enlaces de navegación. Enlaces dentro de texto y la atribución del mapa quedan fuera.
    const controls = [...document.querySelectorAll('button, input:not([type=checkbox]):not([type=radio]):not([type=hidden]), select, textarea, nav a, a.min-h-11')]
      .filter(visible).filter((el) => !el.closest('.leaflet-control-attribution'))
    // Un campo dentro de un envoltorio/etiqueta usa esa caja como área táctil (tocar la etiqueta enfoca el campo).
    const target = (el) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
      ? [el, el.parentElement, el.closest('label')].filter(Boolean).map((x) => x.getBoundingClientRect()).reduce((a, b) => (b.height > a.height ? b : a))
      : el.getBoundingClientRect()
    for (const el of controls) {
      const r = target(el)
      if (r.height < 43.5) problems.push(`${path}: ${describe(el)} mide ${Math.round(r.height)}px de alto`)
      if (el.tagName === 'BUTTON' && r.width < 43.5) problems.push(`${path}: ${describe(el)} mide ${Math.round(r.width)}px de ancho`)
    }
    for (const el of [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea')].filter(visible))
      if (!name(el)) problems.push(`${path}: ${describe(el)} sin nombre accesible`)
    for (const el of [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]), select, textarea')].filter(visible))
      if (!el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) problems.push(`${path}: ${describe(el)} sin etiqueta asociada`)
    for (const img of [...document.querySelectorAll('img')].filter(visible).filter((i) => !i.closest('.leaflet-pane')))
      if (!img.hasAttribute('alt')) problems.push(`${path}: imagen sin alt`)
    return problems
  }, path)
}

async function focusVisible(page, path) {
  const problems = []
  await page.locator('body').click({ position: { x: 1, y: 1 } })
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      // Indicador en el propio control o en su envoltorio (:focus-within).
      const ring = [el, el.parentElement].some((node) => { const s = getComputedStyle(node); return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none') })
      return { ring, label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40) }
    })
    if (info && !info.ring) problems.push(`${path}: foco sin indicador visible en «${info.label}»`)
  }
  return problems
}

async function login(page, email, password) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
}

test('todas las pantallas de dueño y peón: táctil, teclado, etiquetas, foco y errores', async ({ page, request, browser }, testInfo) => {
  await page.route('**/*.tile.openstreetmap.org/**', (route) => route.abort())
  const problems = []
  // Pantallas públicas antes de iniciar sesión.
  for (const path of ['/login', '/register', '/forgot']) {
    await page.goto(path)
    await expect(page.locator('main, form').first()).toBeVisible()
    problems.push(...await audit(page, path), ...await focusVisible(page, path))
  }
  // Errores de formulario anunciados y asociados al campo.
  await page.goto('/login')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  const loginErrors = await page.locator('[role=alert], [aria-invalid=true], :invalid').count()
  if (!loginErrors) problems.push('/login: enviar vacío no anuncia errores')

  const db = await ownerSession(page, request)
  let context
  try {
    const f = await createFarm(page, 'Campo accesible')
    const password = 'clave-de-prueba-10'
    const address = `a11y-${randomUUID()}@test.invalid`
    const workerId = await insertAccount(db, { name: 'Peón accesible', address, role: 'worker', password })
    await fixtureInsert(db, 'Assignments', { farmId: f.id, workerId, createdAt: new Date(), updatedAt: new Date() })
    const ids = await page.evaluate(async ({ farmId, workerId }) => {
      const { csrfToken } = await (await fetch('/api/v1/auth/csrf')).json()
      const post = async (path, body) => (await (await fetch(`/api/v1${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(body) })).json()).id
      const troughId = await post(`/farms/${farmId}/troughs`, { name: 'Bebedero accesible', capacityLiters: 500, latitude: -26, longitude: -59 })
      const animalId = await post(`/farms/${farmId}/animals`, { name: 'Animal accesible', species: 'Bovino', breed: 'Angus', ageYears: 2, state: 'Activo' })
      await post(`/farms/${farmId}/tasks`, { title: 'Tarea accesible', description: 'Revisar', deadline: new Date(Date.now() + 864e5).toISOString(), workerId, troughId })
      return { troughId, animalId }
    }, { farmId: f.id, workerId })
    await submitSample(db, 'water', { resourceId: ids.troughId, sourceKey: `a11y:${ids.troughId}`, percentage: 18, measuredAt: new Date().toISOString() }, { environment: 'test' })
    await submitSample(db, 'animalPosition', { resourceId: ids.animalId, sourceKey: `a11y:${ids.animalId}`, latitude: -26.001, longitude: -59.001, measuredAt: new Date().toISOString() }, { environment: 'test' })
    await createMonitorWorker(db).process()

    for (const path of OWNER_SCREENS) {
      await page.goto(`${path}?farmId=${f.id}`)
      await page.waitForLoadState('networkidle')
      problems.push(...await audit(page, `dueño ${path}`), ...await focusVisible(page, `dueño ${path}`))
    }
    // Estado de agua comunicado con texto además del color.
    await page.goto(`/troughs?farmId=${f.id}`)
    await expect(page.getByText('Agua: 18% · Crítico')).toBeVisible()
    // Errores del formulario de establecimiento.
    await page.goto('/farms')
    await page.getByRole('button', { name: 'Nuevo establecimiento' }).click()
    await page.getByRole('button', { name: 'Guardar establecimiento' }).click()
    if (!await page.locator('[role=alert], [aria-invalid=true], form :invalid').count()) problems.push('dueño /farms: guardar vacío no anuncia errores')
    await page.screenshot({ path: testInfo.outputPath('owner-form-errors.png'), fullPage: true })

    context = await browser.newContext({ viewport: testInfo.project.use.viewport, isMobile: testInfo.project.use.isMobile, hasTouch: true })
    await context.route('**/*.tile.openstreetmap.org/**', (route) => route.abort())
    const worker = await context.newPage()
    await worker.goto('http://127.0.0.1:5173/login')
    await login(worker, address, password)
    for (const path of WORKER_SCREENS) {
      await worker.goto(`http://127.0.0.1:5173${path}?farmId=${f.id}`)
      await worker.waitForLoadState('networkidle')
      problems.push(...await audit(worker, `peón ${path}`), ...await focusVisible(worker, `peón ${path}`))
    }
    // Acción táctil principal del peón: iniciar su tarea.
    await worker.goto(`http://127.0.0.1:5173/tasks?farmId=${f.id}`)
    const start = worker.getByRole('button', { name: 'Iniciar tarea', exact: true })
    await expect(start).toBeVisible()
    await start.tap()
    await expect(worker.getByRole('button', { name: 'Enviar a validación', exact: true })).toBeVisible()
    await worker.screenshot({ path: testInfo.outputPath('worker-tasks.png'), fullPage: true })
  } finally { await context?.close(); await db.close() }
  const unique = [...new Set(problems)]
  testInfo.annotations.push(...unique.map((p) => ({ type: 'problema', description: p })))
  console.log(`[${testInfo.project.name}] ${unique.length} problemas\n${unique.join('\n')}`)
  expect(unique).toEqual([])
})
