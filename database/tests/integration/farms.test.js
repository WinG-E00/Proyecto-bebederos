import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import {
  openIdentityDatabase,
  testDatabaseAvailable,
  insertInvitation,
  email,
} from '../helpers/identityFixtures.js'
import {
  monitoringContext,
  farmBody,
  write,
  fixtureInsert,
  troughBody,
} from '../helpers/monitoringFixtures.js'
describe.skipIf(!testDatabaseAvailable())('dependencias y configuración farms', () => {
  let db, c
  beforeAll(async () => {
    db = await openIdentityDatabase()
    c = await monitoringContext(db)
  }, 30000)
  afterAll(async () => {
    c?.identity.close()
    await db?.close()
  })
  it('bloquea campo vacío con tarea abierta y resuelve alertas al retirarlo', async () => {
    const f = (await write(c.owner, 'post', '/farms', farmBody)).body
    const now = c.clock.now()
    await fixtureInsert(db, 'Assignments', {
      farmId: f.id,
      workerId: c.worker.account.id,
      createdAt: now,
      updatedAt: now,
    })
    const task = await fixtureInsert(db, 'Tasks', {
      farmId: f.id,
      title: 'Recorrer campo',
      description: '',
      deadline: now,
      workerId: c.worker.account.id,
      createdAt: now,
      updatedAt: now,
    })
    const blocked = await write(c.owner, 'delete', `/farms/${f.id}`).expect(409)
    expect(blocked.body.message).toContain('1 tareas abiertas')
    await db.query("UPDATE Tasks SET state='Completada' WHERE id=:id", {
      replacements: { id: task },
    })
    const alert = await fixtureInsert(db, 'Alerts', {
      farmId: f.id,
      resourceType: 'animal',
      resourceId: f.id,
      conditionName: 'missing',
      message: 'Sin datos',
      generatedAt: now,
      activeKey: `fixture:${f.id}`,
    })
    await write(c.owner, 'delete', `/farms/${f.id}`).expect(204)
    const [rows] = await db.query('SELECT resolvedAt,activeKey FROM Alerts WHERE id=:id', {
      replacements: { id: alert },
    })
    expect(rows[0].resolvedAt).toBeTruthy()
    expect(rows[0].activeKey).toBeNull()
    const [history] = await db.query(
      'SELECT type FROM HistoryEvents WHERE farmId=:id ORDER BY id',
      { replacements: { id: f.id } },
    )
    expect(history.map((r) => r.type)).toEqual(['alert', 'retirement'])
  })
  it('bloquea recursos activos, cuenta activos y luego conserva historial/desactiva accesos', async () => {
    const f = (await write(c.owner, 'post', '/farms', farmBody).expect(201)).body
    const other = (
      await write(c.owner, 'post', '/farms', { ...farmBody, name: 'Otro' }).expect(201)
    ).body
    const now = c.clock.now()
    const t = await fixtureInsert(db, 'Troughs', {
      ...troughBody,
      farmId: f.id,
      createdAt: now,
      updatedAt: now,
    })
    await fixtureInsert(db, 'Assignments', {
      farmId: f.id,
      workerId: c.worker.account.id,
      createdAt: now,
      updatedAt: now,
    })
    await fixtureInsert(db, 'WeatherCaches', {
      farmId: f.id,
      queriedLocation: '{}',
      data: '{}',
      fetchedAt: now,
    })
    await insertInvitation(db, {
      ownerId: c.owner.account.id,
      address: email('farm-invite'),
      farmIds: [f.id],
      issuedAt: now,
    })
    expect((await c.owner.agent.get(`/api/v1/farms/${f.id}`)).body.troughCount).toBe(1)
    await write(c.owner, 'delete', `/farms/${f.id}`).expect(409)
    await write(c.owner, 'patch', `/farms/${f.id}`, { latitude: -27, staleMinutes: 10 }).expect(200)
    expect((await c.owner.agent.get(`/api/v1/farms/${other.id}`)).body.staleMinutes).toBe(180)
    const [cache] = await db.query('SELECT * FROM WeatherCaches WHERE farmId=:id', {
      replacements: { id: f.id },
    })
    expect(cache).toHaveLength(0)
    await db.query('UPDATE Troughs SET deletedAt=:now WHERE id=:t', { replacements: { now, t } })
    await write(c.owner, 'delete', `/farms/${f.id}`).expect(204)
    await c.worker.agent.get(`/api/v1/farms/${f.id}`).expect(404)
    const [rows] = await db.query('SELECT active FROM InvitationFarms WHERE farmId=:id', {
      replacements: { id: f.id },
    })
    expect(rows[0].active).toBe(0)
  })
})
