import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { config, ownerSession, createFarm } from './monitoringHelpers.js'
import { capturedLink } from './identityHelpers.js'
test.setTimeout(90000)
test.skip(!config, 'Requiere API real y MySQL de pruebas')
test('US5 invitación real, aceptación y revocación en pantalla abierta', async ({
  page,
  request,
  browser,
}, testInfo) => {
  const db = await ownerSession(page, request)
  let context
  try {
    const farm = await createFarm(page)
    const email = `worker-${randomUUID()}@test.invalid`,
      password = 'clave-de-prueba-10'
    await page.goto('/team')
    await page.getByLabel('Correo del peón').fill(email)
    await page
      .getByRole('group', { name: 'Establecimientos de la invitación' })
      .getByLabel(farm.name)
      .check()
    await page
      .getByRole('button', { name: 'Enviar invitación', exact: true })
      .click()
    await expect(page.getByRole('heading', { name: email })).toBeVisible()
    const link = await capturedLink(db, config, email, 'invitation')
    context = await browser.newContext({
      viewport: testInfo.project.use.viewport,
      isMobile: testInfo.project.use.isMobile,
      hasTouch: true,
    })
    const worker = await context.newPage()
    // Register via real identity API; explicit acceptance still happens in the UI.
    const csrf = (
      await (
        await context.request.get('http://127.0.0.1:3000/api/v1/auth/csrf')
      ).json()
    ).csrfToken
    const token = new URL(link, 'http://local.invalid').searchParams.get(
      'token',
    )
    expect(
      (
        await context.request.post(
          'http://127.0.0.1:3000/api/v1/auth/register',
          {
            headers: { 'X-CSRF-Token': csrf },
            data: {
              name: 'Peón compartido',
              email,
              password,
              invitationToken: token,
            },
          },
        )
      ).status(),
    ).toBe(201)
    await worker.goto(`http://127.0.0.1:5173${link}`)
    await worker.goto('http://127.0.0.1:5173/login')
    await worker.getByLabel('Correo electrónico').fill(email)
    await worker.getByLabel('Contraseña', { exact: true }).fill(password)
    await worker
      .getByRole('button', { name: 'Iniciar sesión', exact: true })
      .click()
    await expect(worker).toHaveURL(/dashboard/)
    await worker.goto(`http://127.0.0.1:5173${link}`)
    await worker
      .getByRole('button', { name: 'Aceptar invitación', exact: true })
      .click()
    await expect(worker.getByText(/Aceptaste la invitación/)).toBeVisible()
    await worker.goto(`http://127.0.0.1:5173/farms`)
    await expect(
      worker.getByRole('heading', { name: farm.name, exact: true }),
    ).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: 'Editar asignaciones' }).click()
    await page
      .getByRole('group', { name: 'Establecimientos asignados' })
      .getByLabel(farm.name)
      .uncheck()
    await page.getByRole('button', { name: 'Guardar asignaciones' }).click()
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await expect(
      worker.getByRole('heading', { name: farm.name, exact: true }),
    ).toHaveCount(0, { timeout: 30000 })
    await page.screenshot({
      path: testInfo.outputPath('team.png'),
      fullPage: true,
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  } finally {
    await context?.close()
    await db.close()
  }
})
