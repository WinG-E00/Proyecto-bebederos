import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { config, ownerSession, createFarm } from './monitoringHelpers.js'
import { verifiedOwner } from './identityHelpers.js'
import { insertAccount } from '../../../../database/tests/helpers/identityFixtures.js'
import { fixtureInsert } from '../../../../database/tests/helpers/monitoringFixtures.js'
test.setTimeout(120000)
test.skip(!config, 'Requiere API real y MySQL de pruebas')

async function login(page, email, password) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
}

// SC-002 en la interfaz: caché por cuenta tras cambiar de sesión, acceso directo por URL
// a un campo ajeno y revocación que retira datos de una vista abierta.
test('aislamiento de caché entre cuentas, URL ajena y revocación en vista abierta', async ({ page, request, browser }, testInfo) => {
  await page.route('**/*.tile.openstreetmap.org/**', (route) => route.abort())
  const db = await ownerSession(page, request)
  let context
  try {
    const nameA = `Campo privado A ${randomUUID().slice(0, 6)}`
    const farmA = await createFarm(page, nameA)
    await page.goto('/farms')
    await expect(page.getByRole('heading', { name: nameA, exact: true })).toBeVisible()
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible()

    const emailB = `owner-b-${randomUUID()}@test.invalid`, password = 'clave-de-prueba-10'
    await verifiedOwner(request, db, config, { name: 'Dueño B de prueba', email: emailB, password })
    await login(page, emailB, password)
    await page.goto('/farms')
    await expect(page.getByText('No hay establecimientos', { exact: false })).toBeVisible()
    await expect(page.getByText(nameA)).toHaveCount(0)
    await page.goto(`/troughs?farmId=${farmA.id}`)
    await expect(page.getByText(nameA)).toHaveCount(0)
    await page.goto(`/dashboard?farmId=${farmA.id}`)
    await expect(page.getByText('No tenés acceso al establecimiento seleccionado.')).toBeVisible()
    await expect(page.getByText(nameA)).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    // Peón asignado al campo A: ve el campo y lo pierde sin recargar al revocarse.
    const address = `iso-worker-${randomUUID()}@test.invalid`
    const workerId = await insertAccount(db, { name: 'Peón aislamiento', address, role: 'worker', password })
    await fixtureInsert(db, 'Assignments', { farmId: farmA.id, workerId, createdAt: new Date(), updatedAt: new Date() })
    context = await browser.newContext({ viewport: testInfo.project.use.viewport, isMobile: testInfo.project.use.isMobile, hasTouch: true })
    await context.route('**/*.tile.openstreetmap.org/**', (route) => route.abort())
    const worker = await context.newPage()
    await worker.goto('http://127.0.0.1:5173/login')
    await worker.getByLabel('Correo electrónico').fill(address)
    await worker.getByLabel('Contraseña', { exact: true }).fill(password)
    await worker.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
    await expect(worker).toHaveURL(/dashboard/)
    await worker.goto(`http://127.0.0.1:5173/farms`)
    await expect(worker.getByRole('heading', { name: nameA, exact: true })).toBeVisible()
    const revokedAt = Date.now()
    await db.query('UPDATE Assignments SET active=FALSE, revokedAt=:now, updatedAt=:now WHERE farmId=:farmId AND workerId=:workerId', { replacements: { now: new Date(), farmId: farmA.id, workerId } })
    await expect(worker.getByRole('heading', { name: nameA, exact: true })).toHaveCount(0, { timeout: 30000 })
    testInfo.annotations.push({ type: 'revocación retirada (ms)', description: String(Date.now() - revokedAt) })
    await page.screenshot({ path: testInfo.outputPath('access-isolation.png'), fullPage: true })
  } finally { await context?.close(); await db.close() }
})
