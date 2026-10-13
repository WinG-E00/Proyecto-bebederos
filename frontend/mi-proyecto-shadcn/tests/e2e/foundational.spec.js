import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

test('confirmación nativa contiene el foco y Escape lo devuelve al disparador', async ({ page }, testInfo) => {
  await page.goto('/tests/foundation/index.html')
  const trigger = page.getByRole('button', { name: 'Retirar recurso de prueba' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Retirar bebedero' })
  await expect(dialog).toBeVisible()
  const cancel = dialog.getByRole('button', { name: 'Cancelar' })
  const confirm = dialog.getByRole('button', { name: 'Retirar', exact: true })
  await expect(cancel).toBeFocused()
  await page.keyboard.press('Tab'); await expect(confirm).toBeFocused()
  await page.keyboard.press('Tab'); await expect(cancel).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  for (const button of [cancel, confirm]) expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44)
  if (process.env.CAPTURE_PHASE2 === '1') {
    const directory = fileURLToPath(new URL('../../../../specs/001-monitoreo-bebederos/validation/screenshots/', import.meta.url))
    await mkdir(directory, { recursive: true })
    await page.screenshot({ path: `${directory}/confirmation-${testInfo.project.name}.png`, fullPage: true })
  }
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused()
  await expect(page.getByText('Confirmación de prueba registrada.')).not.toBeVisible()
})

test('solo confirma mediante acción explícita y mantiene mensajes accesibles', async ({ page }) => {
  await page.goto('/tests/foundation/index.html')
  await expect(page.getByRole('alert')).toHaveText(/Conexión de prueba/)
  await page.getByRole('button', { name: 'Retirar recurso de prueba' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Retirar', exact: true }).click()
  await expect(page.getByText('Confirmación de prueba registrada.')).toBeVisible()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
