import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { openIdentityDatabase, testDatabaseAvailable } from '../helpers/identityFixtures.js'
import { monitoringContext, farmBody, write } from '../helpers/monitoringFixtures.js'
describe.skipIf(!testDatabaseAvailable())('contrato farms', () => {
  let db, ctx, id
  beforeAll(async () => {
    db = await openIdentityDatabase()
    ctx = await monitoringContext(db)
  }, 30000)
  afterAll(async () => {
    ctx?.identity.close()
    await db?.close()
  })
  it('crea, lista, detalla y edita campo propio con cantidades cero', async () => {
    const r = await write(ctx.owner, 'post', '/farms', farmBody).expect(201)
    id = r.body.id
    expect(r.body).toMatchObject({ ...farmBody, animalCount: 0, troughCount: 0 })
    expect(
      (await ctx.owner.agent.get('/api/v1/farms').expect(200)).body.items.map((f) => f.id),
    ).toContain(id)
    await ctx.owner.agent.get(`/api/v1/farms/${id}`).expect(200)
    expect(
      (await write(ctx.owner, 'patch', `/farms/${id}`, { staleMinutes: 60 }).expect(200)).body
        .staleMinutes,
    ).toBe(60)
    expect(
      (await write(ctx.owner, 'patch', `/farms/${id}`, { name: 'Nombre nuevo' }).expect(200)).body
        .staleMinutes,
    ).toBe(60)
  })
  it.each([
    { areaHa: -1 },
    { latitude: 91 },
    { longitude: -181 },
    { staleMinutes: 0 },
    { staleMinutes: 1.5 },
    { timezone: 'Fake/Zone' },
    { name: ' ' },
    { ownerId: 1 },
  ])('rechaza %j', async (extra) => {
    await write(ctx.owner, 'post', '/farms', { ...farmBody, ...extra }).expect(422)
  })
  it('rechaza escrituras peón y acceso ajeno', async () => {
    await write(ctx.worker, 'post', '/farms', farmBody).expect(403)
    await ctx.other.agent.get(`/api/v1/farms/${id}`).expect(404)
  })
  it('baja lógica elimina del listado y conserva fila', async () => {
    await write(ctx.owner, 'delete', `/farms/${id}`).expect(204)
    await ctx.owner.agent.get(`/api/v1/farms/${id}`).expect(404)
    const [r] = await db.query('SELECT deletedAt FROM Farms WHERE id=:id', { replacements: { id } })
    expect(r[0].deletedAt).toBeTruthy()
  })
})
