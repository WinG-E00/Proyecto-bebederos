import { randomUUID } from 'node:crypto'
import { expect } from '@playwright/test'
import { fullStackConfig, openTestDatabase, verifiedOwner } from './identityHelpers.js'
export const config = fullStackConfig()
export async function ownerSession(page, request) {
  const db = openTestDatabase(config)
  const email = `monitor-${randomUUID()}@test.invalid`
  const password = 'clave-de-prueba-10'
  await verifiedOwner(request, db, config, { name: 'Dueño de prueba', email, password })
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page).toHaveURL(/dashboard/)
  return db
}
export async function createFarm(page, name = 'Campo E2E') {
  await page.goto('/farms')
  await page.getByRole('button', { name: 'Nuevo establecimiento' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill(name)
  await page.getByLabel('Latitud', { exact: true }).fill('-26')
  await page.getByLabel('Longitud', { exact: true }).fill('-59')
  await page.getByLabel('Superficie (ha)').fill('20')
  await page.getByRole('button', { name: 'Guardar establecimiento' }).click()
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  const farm = await page.evaluate(async () => {
    const r = await fetch('/api/v1/farms')
    return (await r.json()).items.at(-1)
  })
  return farm
}
