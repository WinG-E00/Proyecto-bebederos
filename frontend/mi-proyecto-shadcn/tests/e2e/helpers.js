export const TEST_ACCOUNTS = Object.freeze({
  owner: { name: 'Dueño de prueba E2E', email: 'owner-e2e@test.invalid', role: 'owner' },
  otherOwner: { name: 'Segundo dueño de prueba E2E', email: 'other-owner-e2e@test.invalid', role: 'owner' },
  worker: { name: 'Peón de prueba E2E', email: 'worker-e2e@test.invalid', role: 'worker' },
})

export const TEST_DATA = Object.freeze({
  farmName: 'Campo de prueba E2E', troughName: 'Bebedero de prueba E2E', animalName: 'Animal de prueba E2E',
})

export function testAccount(role) {
  const account = TEST_ACCOUNTS[role]
  if (!account) throw new Error('Cuenta de prueba desconocida')
  const password = process.env.DEMO_PASSWORD
  if (!password || password.length < 10 || Buffer.byteLength(password) > 72) {
    throw new Error('Configurar DEMO_PASSWORD de pruebas (10 caracteres, máximo 72 bytes)')
  }
  return { ...account, password }
}

export async function prepareBaselinePage(page) {
  await page.clock.install({ time: new Date('2026-10-13T12:00:00.000Z') })
  // Capturas deterministas y sin consultas a proveedores de teselas.
  await page.route('https://*.tile.openstreetmap.org/**', (route) => route.fulfill({
    status: 200, contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afooAAAAASUVORK5CYII=', 'base64'),
  }))
}
