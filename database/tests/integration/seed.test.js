import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { openIdentityDatabase } from '../helpers/identityFixtures.js'
import { select } from '../../services/monitoringSql.service.js'
import { seedPilot } from '../../scripts/seed.js'
import { createDashboardService } from '../../services/dashboard.service.js'
import { PILOT_DOMAIN } from '../fixtures/pilot.js'

let db
beforeAll(async () => { db = await openIdentityDatabase() }, 30000)
afterAll(async () => { await db?.close() })

const password = 'clave-piloto-de-prueba'
async function pilotCounts() {
  const [row] = await select(db, `SELECT
    (SELECT COUNT(*) FROM Accounts WHERE email LIKE :domain) accounts,
    (SELECT COUNT(*) FROM Farms f JOIN Accounts o ON o.id=f.ownerId WHERE o.email LIKE :domain AND f.deletedAt IS NULL) farms,
    (SELECT COUNT(*) FROM Troughs t JOIN Farms f ON f.id=t.farmId JOIN Accounts o ON o.id=f.ownerId WHERE o.email LIKE :domain AND t.deletedAt IS NULL) troughs,
    (SELECT COUNT(*) FROM Animals a JOIN Farms f ON f.id=a.farmId JOIN Accounts o ON o.id=f.ownerId WHERE o.email LIKE :domain AND a.deletedAt IS NULL) animals,
    (SELECT COUNT(*) FROM WaterReadings w JOIN Troughs t ON t.id=w.troughId JOIN Farms f ON f.id=t.farmId JOIN Accounts o ON o.id=f.ownerId WHERE o.email LIKE :domain AND w.sourceKey LIKE 'pilot:%') readings`,
  { domain: `%@${PILOT_DOMAIN}` })
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, Number(v)]))
}

it('seed del piloto: 10 campos, 100 bebederos, 1.000 animales, idempotente y peón compartido', async () => {
  const first = await seedPilot(db, { environment: 'test', password })
  const second = await seedPilot(db, { environment: 'test', password })
  expect(second.summary).toEqual({ accounts: 0, farms: 0, troughs: 0, animals: 0, assignments: 0 })
  expect(await pilotCounts()).toEqual({ accounts: 3, farms: 10, troughs: 100, animals: 1000, readings: 100 })
  expect(second.ids).toEqual(first.ids)
  const dashboard = createDashboardService(db)
  const worker = await dashboard.get({ id: first.ids.worker, role: 'worker' })
  expect(worker).toMatchObject({ farms: 2, troughs: 20, animals: 200, workers: null })
  const ownerB = await dashboard.get({ id: first.ids.ownerB, role: 'owner' })
  expect(ownerB).toMatchObject({ farms: 4, troughs: 40, animals: 400, workers: 1 })
}, 180000)

it('rechaza producción y contraseña ausente; API y worker no ejecutan el seed al arrancar', async () => {
  await expect(seedPilot(db, { environment: 'production', password })).rejects.toThrow(/desarrollo o pruebas/)
  await expect(seedPilot(db, { environment: 'development' })).rejects.toThrow(/DEMO_PASSWORD/)
  for (const file of ['../../server.js', '../../workers/index.js', '../../app.js'])
    expect(readFileSync(new URL(file, import.meta.url), 'utf8')).not.toMatch(/seed/i)
})
