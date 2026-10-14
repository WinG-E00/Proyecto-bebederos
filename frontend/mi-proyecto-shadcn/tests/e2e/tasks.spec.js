import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { config, ownerSession, createFarm } from './monitoringHelpers.js'
import { insertAccount } from '../../../../database/tests/helpers/identityFixtures.js'
import { fixtureInsert } from '../../../../database/tests/helpers/monitoringFixtures.js'
test.setTimeout(120000)
test.skip(!config, 'Requiere API y MySQL de pruebas')
test('US6 crear, iniciar, enviar, rechazar con motivo y aprobar en teléfono', async ({
  page,
  request,
  browser,
}, testInfo) => {
  const db = await ownerSession(page, request)
  let context
  try {
    const farm = await createFarm(page),
      email = `task-worker-${randomUUID()}@test.invalid`,
      password = 'clave-de-prueba-10'
    const workerId = await insertAccount(db, {
      name: 'Peón de tareas',
      address: email,
      role: 'worker',
      password,
    })
    await fixtureInsert(db, 'Assignments', {
      farmId: farm.id,
      workerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await page.goto(`/tasks?farmId=${farm.id}`)
    await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click()
    await page
      .getByLabel('Título', { exact: true })
      .fill('Revisar flotante E2E')
    await page
      .getByLabel('Descripción', { exact: true })
      .fill('Controlar el flotante del bebedero')
    await page
      .getByLabel('Fecha límite', { exact: true })
      .fill('2020-01-01T12:00')
    await page
      .getByRole('combobox', { name: 'Peón responsable', exact: true })
      .selectOption({ value: String(workerId) }, { timeout: 10000 })
    await page
      .getByRole('button', { name: 'Guardar tarea', exact: true })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Revisar flotante E2E' }),
    ).toBeVisible()
    await expect(page.getByText('Tarea vencida', { exact: true })).toBeVisible()
    context = await browser.newContext({
      viewport: testInfo.project.use.viewport,
      isMobile: testInfo.project.use.isMobile,
      hasTouch: true,
    })
    const worker = await context.newPage()
    await worker.goto('http://127.0.0.1:5173/login')
    await worker.getByLabel('Correo electrónico').fill(email)
    await worker.getByLabel('Contraseña', { exact: true }).fill(password)
    await worker
      .getByRole('button', { name: 'Iniciar sesión', exact: true })
      .click()
    await expect(worker).toHaveURL(/dashboard/)
    await worker.goto(`http://127.0.0.1:5173/tasks?farmId=${farm.id}`)
    await worker
      .getByRole('button', { name: 'Iniciar tarea', exact: true })
      .click()
    await expect(
      worker.getByRole('button', { name: 'Enviar a validación', exact: true }),
    ).toBeVisible()
    await worker
      .getByRole('button', { name: 'Enviar a validación', exact: true })
      .click()
    await expect(
      worker.getByText(/Estado: Pendiente de validación/),
    ).toBeVisible()
    await page.reload()
    await expect(
      page.getByRole('button', { name: 'Rechazar tarea', exact: true }),
    ).toBeDisabled()
    await page
      .getByLabel('Motivo del rechazo', { exact: true })
      .fill('Falta limpiar el caño')
    await page
      .getByRole('button', { name: 'Rechazar tarea', exact: true })
      .click()
    await worker
      .getByRole('link', { name: 'Ver historial de la tarea', exact: true })
      .click()
    await expect(
      worker.getByText('Motivo: Falta limpiar el caño', { exact: true }),
    ).toBeVisible({ timeout: 20000 })
    await worker
      .getByRole('button', { name: 'Enviar a validación', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Aprobar tarea', exact: true }),
    ).toBeVisible({ timeout: 20000 })
    await page
      .getByRole('button', { name: 'Aprobar tarea', exact: true })
      .click()
    await expect(page.getByText(/Estado: Completada/)).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Asignar responsable', exact: true }),
    ).toHaveCount(0)
    await expect(worker.getByText(/Estado: Completada/)).toBeVisible({
      timeout: 20000,
    })
    await expect(
      worker.getByRole('button', { name: 'Aprobar tarea', exact: true }),
    ).toHaveCount(0)
    await page.screenshot({
      path: testInfo.outputPath('tasks-owner.png'),
      fullPage: true,
    })
    await worker.screenshot({
      path: testInfo.outputPath('tasks-worker.png'),
      fullPage: true,
    })
    for (const p of [page, worker])
      expect(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
    const [notes] = await db.query(
      'SELECT * FROM Notifications WHERE farmId=:farmId',
      { replacements: { farmId: farm.id } },
    )
    expect(notes.map((n) => n.type)).toEqual(
      expect.arrayContaining(['created', 'submit', 'reject', 'approve']),
    )
  } finally {
    await context?.close()
    await db.close()
  }
})
