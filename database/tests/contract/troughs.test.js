import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { openIdentityDatabase, testDatabaseAvailable } from '../helpers/identityFixtures.js'
import { monitoringContext, farmBody, troughBody, write } from '../helpers/monitoringFixtures.js'
describe.skipIf(!testDatabaseAvailable())('contrato troughs', () => {
  let db, c, f, id
  beforeAll(async () => {
    db = await openIdentityDatabase()
    c = await monitoringContext(db)
    f = (await write(c.owner, 'post', '/farms', farmBody).expect(201)).body
  }, 30000)
  afterAll(async () => {
    c?.identity.close()
    await db?.close()
  })
  it('alta con ausencia de agua, consulta y separación estado/categoría', async () => {
    const r = await write(c.owner, 'post', `/farms/${f.id}/troughs`, troughBody).expect(201)
    id = r.body.id
    expect(r.body).toMatchObject({
      waterLevel: null,
      waterCategory: null,
      freshness: 'missing',
      lastUpdatedAt: null,
    })
    await c.owner.agent.get(`/api/v1/troughs/${id}`).expect(200)
    expect((await c.owner.agent.get(`/api/v1/troughs?farmId=${f.id}`)).body.total).toBe(1)
  })
  it.each([
    { waterLevel: 20 },
    { percentage: 20 },
    { locationSource: 'device' },
    { latitude: 91 },
    { longitude: null },
    { capacityLiters: 0 },
    { measuredAt: '2026-10-13T12:00Z' },
  ])('rechaza administración inválida/telemetría %j', async (extra) => {
    await write(c.owner, 'post', `/farms/${f.id}/troughs`, { ...troughBody, ...extra }).expect(422)
  })
  it('no permite crear al peón ni leer ajenos y baja conserva hechos', async () => {
    await write(c.worker, 'post', `/farms/${f.id}/troughs`, troughBody).expect(403)
    await c.other.agent.get(`/api/v1/troughs/${id}`).expect(404)
    await write(c.owner, 'delete', `/troughs/${id}`).expect(204)
    await c.owner.agent.get(`/api/v1/troughs/${id}`).expect(404)
  })
})
