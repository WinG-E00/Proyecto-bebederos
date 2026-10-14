import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { openIdentityDatabase, testDatabaseAvailable } from '../helpers/identityFixtures.js'
import {
  monitoringContext,
  farmBody,
  animalBody,
  troughBody,
  write,
  fixtureInsert,
} from '../helpers/monitoringFixtures.js'
describe.skipIf(!testDatabaseAvailable())('contrato animales/mapa', () => {
  let db, c, f, id
  beforeAll(async () => {
    db = await openIdentityDatabase()
    c = await monitoringContext(db)
    f = (await write(c.owner, 'post', '/farms', farmBody)).body
  }, 30000)
  afterAll(async () => {
    c?.identity.close()
    await db?.close()
  })
  it('alta sin GPS ni visita ficticia; edita administración', async () => {
    const r = await write(c.owner, 'post', `/farms/${f.id}/animals`, animalBody).expect(201)
    id = r.body.id
    expect(r.body).toMatchObject({ position: null, lastVisit: null, freshness: 'missing' })
    await c.owner.agent.get(`/api/v1/animals/${id}`).expect(200)
    expect(
      (await write(c.owner, 'patch', `/animals/${id}`, { ageYears: 3 }).expect(200)).body.ageYears,
    ).toBe(3)
  })
  it.each([
    { latitude: 0 },
    { position: { latitude: 0, longitude: 0 } },
    { lastVisit: {} },
    { ageYears: -1 },
    { species: ' ' },
    { measuredAt: '2026-10-13T12:00Z' },
  ])('rechaza GPS/visita/metadata inválida %j', async (extra) => {
    await write(c.owner, 'post', `/farms/${f.id}/animals`, { ...animalBody, ...extra }).expect(422)
    await write(c.owner, 'patch', `/animals/${id}`, extra).expect(422)
  })
  it('mapa autorizado global/por campo; peón solo campos asignados; no GPS ficticio', async () => {
    await write(c.owner, 'post', `/farms/${f.id}/troughs`, troughBody).expect(201)
    const now = c.clock.now()
    await fixtureInsert(db, 'Assignments', {
      farmId: f.id,
      workerId: c.worker.account.id,
      createdAt: now,
      updatedAt: now,
    })
    const m = (await c.worker.agent.get(`/api/v1/map?farmId=${f.id}`).expect(200)).body
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ type: 'trough', farmId: f.id, latitude: -26, longitude: -59 })
    expect((await c.other.agent.get('/api/v1/map').expect(200)).body).toEqual([])
    await c.other.agent.get(`/api/v1/map?farmId=${f.id}`).expect(404)
    await write(c.worker, 'post', `/farms/${f.id}/animals`, animalBody).expect(403)
    await c.other.agent.get(`/api/v1/animals/${id}`).expect(404)
  })
  it('baja animal lógica preserva referencia y retira consulta', async () => {
    await write(c.owner, 'delete', `/animals/${id}`).expect(204)
    await c.owner.agent.get(`/api/v1/animals/${id}`).expect(404)
  })
})
