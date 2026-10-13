import { test, expect } from '@playwright/test'
import { prepareBaselinePage } from './helpers.js'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'

for (const [role, heading] of [['owner', 'Dueño'], ['worker', 'Monitoreo de Bebederos']]) {
  test(`baseline del panel ${role}`, async ({ page }, testInfo) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await prepareBaselinePage(page)
    await page.goto(`/tests/baseline/index.html?role=${role}`)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await expect(page.getByRole('button', { name: 'Activar modo oscuro' })).toBeVisible()
    expect(errors).toEqual([])
    if (process.env.CAPTURE_BASELINE === '1') {
      const directory = fileURLToPath(new URL('../../../../specs/001-monitoreo-bebederos/validation/screenshots/', import.meta.url))
      await mkdir(directory, { recursive: true })
      await page.screenshot({ path: `${directory}/${role}-${testInfo.project.name}.png`, fullPage: true, animations: 'disabled' })
    }
  })
}
