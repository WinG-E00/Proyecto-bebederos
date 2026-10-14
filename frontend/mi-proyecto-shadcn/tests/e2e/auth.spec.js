import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { activeFarmIds, capturedLink, fullStackConfig, invitationFixture, openTestDatabase, verifiedOwner } from './identityHelpers.js'

// US1 de punta a punta: Vite + Express (`npm run dev --prefix database`) + MySQL de pruebas
// migrado + captura SMTP desde la cola cifrada. Sin E2E_FULLSTACK=1 se omite.
const config = fullStackConfig()
const PASSWORD = 'clave-e2e-segura-10'
const NEW_PASSWORD = 'nueva-clave-e2e-10'

test.describe('acceso con rol único (US1)', () => {
  test.skip(!config, 'Requiere E2E_FULLSTACK=1, API real y MySQL de pruebas (ver validation/US1.md)')
  let db
  const run = randomUUID().slice(0, 8)
  const address = (label, project) => `${label}-${project}-${run}@test.invalid`

  test.beforeAll(() => { db = openTestDatabase(config) })
  test.afterAll(async () => { await db?.close() })

  test('dueño: registro, verificación por enlace de un uso, sesión, perfil y cierre', async ({ page }, testInfo) => {
    const email = address('owner', testInfo.project.name)
    await page.goto('/register')
    await expect(page.getByRole('combobox')).toHaveCount(0)
    await page.getByLabel('Nombre completo').fill('Dueña E2E')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    await expect(page.getByRole('heading', { name: 'Revisá tu correo' })).toBeVisible()

    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page.getByText(/verificar tu correo/)).toBeVisible()

    const link = await capturedLink(db, config, email, 'verification')
    await page.goto(link)
    await expect(page.getByText(/quedó verificado/)).toBeVisible()
    await expect(page).toHaveURL(/\/verify$/)
    await page.goto(link)
    await expect(page.getByText(/no es válido, ya se usó o venció/)).toBeVisible()

    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page.getByRole('heading', { name: 'Dueño' })).toBeVisible()
    const cookies = await page.context().cookies()
    const session = cookies.find((cookie) => cookie.name === 'bebederos.sid')
    expect(session).toMatchObject({ httpOnly: true, sameSite: 'Lax' })
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toMatch(/owner|worker|csrf|bebederos\.sid/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    await page.getByRole('link', { name: 'Mi perfil' }).click()
    await expect(page.getByText(email)).toBeVisible()
    await expect(page.getByText(/Rol \(no editable\)\s*Dueño/)).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible()
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('peón: invitación fixture, cuenta nueva, aceptación explícita y rechazo de un dueño', async ({ page, request }, testInfo) => {
    const ownerEmail = address('inv-owner', testInfo.project.name)
    const workerEmail = address('inv-worker', testInfo.project.name)
    const ownerId = await verifiedOwner(request, db, config, { name: 'Dueño E2E', email: ownerEmail, password: PASSWORD })
    const forOwner = await invitationFixture(db, { ownerId, workerEmail: ownerEmail })
    const invitation = await invitationFixture(db, { ownerId, workerEmail })

    // Una cuenta dueño no puede aceptar como peón.
    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill(ownerEmail)
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page.getByRole('heading', { name: 'Dueño' })).toBeVisible()
    await page.goto(`/invite?token=${forOwner.token}`)
    await expect(page.getByText(/cuenta de dueño no puede aceptar/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aceptar invitación' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page.getByLabel('Nombre completo')).toBeVisible()

    await page.goto(`/invite?token=${invitation.token}`)
    await expect(page).toHaveURL(/\/invite$/)
    await page.getByLabel('Nombre completo').fill('Peón E2E')
    await page.getByLabel('Correo electrónico').fill(workerEmail)
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Crear cuenta de peón' }).click()
    await expect(page.getByRole('button', { name: 'Aceptar invitación' })).toBeVisible()
    expect(await activeFarmIds(db, workerEmail)).toEqual([])
    await page.getByRole('button', { name: 'Aceptar invitación' }).click()
    await expect(page.getByText(/acceso a 1 campo/)).toBeVisible()
    expect(await activeFarmIds(db, workerEmail)).toEqual([invitation.farmId])
    await page.getByRole('link', { name: 'Ir a mi panel' }).click()
    await expect(page.getByText('Peón E2E · Peón')).toBeVisible()
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(invitation.token)
  })

  test('recuperación: enlace de un uso, contraseña nueva y sesiones anteriores invalidadas', async ({ page, browser, request }, testInfo) => {
    const email = address('reset', testInfo.project.name)
    await verifiedOwner(request, db, config, { name: 'Dueño Recuperación', email, password: PASSWORD })
    const other = await browser.newContext()
    const otherPage = await other.newPage()
    await otherPage.goto('/login')
    await otherPage.getByLabel('Correo electrónico').fill(email)
    await otherPage.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await otherPage.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(otherPage.getByRole('heading', { name: 'Dueño' })).toBeVisible()

    await page.goto('/forgot')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByRole('button', { name: 'Enviar enlace' }).click()
    await expect(page.getByText(/Si existe una cuenta con ese correo/)).toBeVisible()
    const link = await capturedLink(db, config, email, 'recovery')
    await page.goto(link)
    await expect(page).toHaveURL(/\/reset$/)
    await page.getByLabel('Nueva contraseña', { exact: true }).fill(NEW_PASSWORD)
    await page.getByLabel('Repetí la contraseña', { exact: true }).fill(NEW_PASSWORD)
    await page.getByRole('button', { name: 'Guardar contraseña' }).click()
    await expect(page.getByText(/Tu contraseña cambió/)).toBeVisible()
    await page.goto(link)
    await page.getByLabel('Nueva contraseña', { exact: true }).fill(PASSWORD)
    await page.getByLabel('Repetí la contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Guardar contraseña' }).click()
    await expect(page.getByText(/no es válido, ya se usó o venció/)).toBeVisible()

    // La sesión abierta antes del cambio se retira dentro del intervalo de consulta (≤ 30 s).
    await expect(otherPage).toHaveURL(/\/login$/, { timeout: 30000 })
    await other.close()

    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(NEW_PASSWORD)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
    await expect(page.getByRole('heading', { name: 'Dueño' })).toBeVisible()
  })
})
