import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { openIdentityDatabase, testDatabaseAvailable } from '../helpers/identityFixtures.js'
import {
  monitoringContext,
  farmBody,
  troughBody,
  write,
  fixtureInsert,
} from '../helpers/monitoringFixtures.js'
import { submitSample } from '../../scripts/sample.js'
import { createWaterProcessing } from '../../services/waterProcessing.service.js'
import { waterSamples } from '../fixtures/water.js'
describe.skipIf(!testDatabaseAvailable())('agua transaccional', () => {
  let db, c, t, f
  beforeAll(async () => {
    db = await openIdentityDatabase()
    c = await monitoringContext(db)
    f = (await write(c.owner, 'post', '/farms', farmBody)).body
    t = (await write(c.owner, 'post', `/farms/${f.id}/troughs`, troughBody)).body
  }, 30000)
  afterAll(async () => {
    c?.identity.close()
    await db?.close()
  })
  it('procesa todos los límites, permite valores iguales y deduplica claves/reinicios/concurrencia', async () => {
    const samples = waterSamples(t.id, c.clock.now())
    for (const s of samples) await submitSample(db, 'water', s, { environment: 'test' })
    expect(await submitSample(db, 'water', samples[0], { environment: 'test' })).toBeGreaterThan(0)
    await Promise.all([
      createWaterProcessing(db, { clock: c.clock }).process(),
      createWaterProcessing(db, { clock: c.clock }).process(),
    ])
    const detail = (await c.owner.agent.get(`/api/v1/troughs/${t.id}`)).body
    expect(detail).toMatchObject({ waterLevel: 100, waterCategory: 'Normal' })
    const [events] = await db.query(
      "SELECT details FROM HistoryEvents WHERE farmId=:id AND type='water'",
      { replacements: { id: f.id } },
    )
    expect(events).toHaveLength(6)
    await createWaterProcessing(db, { clock: c.clock }).process()
    const [again] = await db.query(
      "SELECT id FROM HistoryEvents WHERE farmId=:id AND type='water'",
      { replacements: { id: f.id } },
    )
    expect(again).toHaveLength(6)
  })
  it('porcentajes repetidos con claves distintas siguen siendo muestras legítimas', async () => {
    const sample = {
      resourceId: t.id,
      percentage: 100,
      sourceKey: `equal:${t.id}`,
      measuredAt: c.clock.now().toISOString(),
    }
    await submitSample(db, 'water', sample, { environment: 'test' })
    await createWaterProcessing(db, { clock: c.clock }).process()
    const [rows] = await db.query('SELECT processedAt FROM WaterReadings WHERE sourceKey=:key', {
      replacements: { key: sample.sourceKey },
    })
    expect(rows[0].processedAt).toBeTruthy()
    await expect(
      submitSample(db, 'water', { ...sample, percentage: 0 }, { environment: 'test' }),
    ).rejects.toThrow(/reutilizada/)
  })
  it('antigua/futura no reemplaza; GPS de dispositivo independiente; inválida no se inserta', async () => {
    const now = c.clock.now()
    const base = { resourceId: t.id, percentage: 20 }
    await submitSample(
      db,
      'water',
      { ...base, sourceKey: `old:${t.id}`, measuredAt: new Date(now - 100000).toISOString() },
      { environment: 'test' },
    )
    await submitSample(
      db,
      'water',
      { ...base, sourceKey: `future:${t.id}`, measuredAt: new Date(+now + 100000).toISOString() },
      { environment: 'test' },
    )
    await expect(
      submitSample(
        db,
        'water',
        { ...base, percentage: 101, sourceKey: `invalid:${t.id}`, measuredAt: now.toISOString() },
        { environment: 'test' },
      ),
    ).rejects.toThrow()
    await submitSample(
      db,
      'troughPosition',
      {
        resourceId: t.id,
        sourceKey: `gps:${t.id}`,
        latitude: -27,
        longitude: -60,
        measuredAt: now.toISOString(),
      },
      { environment: 'test' },
    )
    await createWaterProcessing(db, { clock: c.clock }).process()
    expect((await c.owner.agent.get(`/api/v1/troughs/${t.id}`)).body).toMatchObject({
      waterLevel: 100,
      latitude: -27,
      longitude: -60,
      locationSource: 'device',
    })
    const [rows] = await db.query(
      'SELECT processingResult FROM WaterReadings WHERE troughId=:id ORDER BY id DESC LIMIT 2',
      { replacements: { id: t.id } },
    )
    expect(rows.map((r) => r.processingResult)).toEqual(['future', 'historical'])
  })
  it('bloquea baja con tarea abierta y conserva lecturas tras retiro', async () => {
    const now = c.clock.now()
    await fixtureInsert(db, 'Assignments', {
      farmId: f.id,
      workerId: c.worker.account.id,
      createdAt: now,
      updatedAt: now,
    })
    const task = await fixtureInsert(db, 'Tasks', {
      farmId: f.id,
      title: 'Reparar',
      description: '',
      deadline: now,
      workerId: c.worker.account.id,
      troughId: t.id,
      createdAt: now,
      updatedAt: now,
    })
    await write(c.owner, 'delete', `/troughs/${t.id}`).expect(409)
    await db.query("UPDATE Tasks SET state='Completada' WHERE id=:id", {
      replacements: { id: task },
    })
    await write(c.owner, 'delete', `/troughs/${t.id}`).expect(204)
    const [r] = await db.query('SELECT COUNT(*) total FROM WaterReadings WHERE troughId=:id', {
      replacements: { id: t.id },
    })
    expect(r[0].total).toBe(9)
    await submitSample(
      db,
      'water',
      {
        resourceId: t.id,
        sourceKey: `retired:${t.id}`,
        percentage: 10,
        measuredAt: now.toISOString(),
      },
      { environment: 'test' },
    )
    await createWaterProcessing(db, { clock: c.clock }).process()
    const [s] = await db.query('SELECT processingResult FROM WaterReadings WHERE sourceKey=:key', {
      replacements: { key: `retired:${t.id}` },
    })
    expect(s[0].processingResult).toBe('retired')
  })
})
