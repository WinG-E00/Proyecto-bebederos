import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { openIdentityDatabase, testDatabaseAvailable } from '../helpers/identityFixtures.js'
import {
  monitoringContext,
  farmBody,
  animalBody,
  troughBody,
  write,
} from '../helpers/monitoringFixtures.js'
import { submitSample } from '../../scripts/sample.js'
import { createPositionProcessing } from '../../services/positionProcessing.service.js'
import { positionSamples } from '../fixtures/positions.js'
describe.skipIf(!testDatabaseAvailable())('posiciones/visitas MySQL', () => {
  let db, c, f, a, t
  beforeAll(async () => {
    db = await openIdentityDatabase()
    c = await monitoringContext(db)
    f = (await write(c.owner, 'post', '/farms', farmBody)).body
    t = (
      await write(c.owner, 'post', `/farms/${f.id}/troughs`, {
        ...troughBody,
        latitude: 0,
        longitude: 0,
      })
    ).body
    a = (await write(c.owner, 'post', `/farms/${f.id}/animals`, animalBody)).body
  }, 30000)
  afterAll(async () => {
    c?.identity.close()
    await db?.close()
  })
  it('primera entrada/permanencia/reentrada, claves duplicadas, reinicio y workers concurrentes', async () => {
    const samples = positionSamples(a.id, c.clock.now())
    for (const s of samples) await submitSample(db, 'animalPosition', s, { environment: 'test' })
    await submitSample(db, 'animalPosition', samples[1], { environment: 'test' })
    await Promise.all([
      createPositionProcessing(db, { clock: c.clock }).process(),
      createPositionProcessing(db, { clock: c.clock }).process(),
    ])
    const [visits] = await db.query('SELECT * FROM EstimatedVisits WHERE animalId=:id', {
      replacements: { id: a.id },
    })
    expect(visits).toHaveLength(2)
    expect(visits.every((v) => v.troughId === t.id)).toBe(true)
    await createPositionProcessing(db, { clock: c.clock }).process()
    const [again] = await db.query('SELECT * FROM EstimatedVisits WHERE animalId=:id', {
      replacements: { id: a.id },
    })
    expect(again).toHaveLength(2)
    expect((await c.owner.agent.get(`/api/v1/animals/${a.id}`)).body).toMatchObject({
      position: { latitude: 0, longitude: 0 },
      lastVisit: { troughId: t.id, estimated: true },
    })
  })
  it('histórica/futura sin efectos actuales o visitas; aislamiento y mapas', async () => {
    const now = c.clock.now()
    for (const [label, offset] of [
      ['old', -100000],
      ['future', 100000],
    ])
      await submitSample(
        db,
        'animalPosition',
        {
          sourceKey: `${label}:${a.id}`,
          resourceId: a.id,
          latitude: 0.01,
          longitude: 0,
          measuredAt: new Date(+now + offset).toISOString(),
        },
        { environment: 'test' },
      )
    await createPositionProcessing(db, { clock: c.clock }).process()
    expect((await c.owner.agent.get(`/api/v1/animals/${a.id}`)).body.position.latitude).toBe(0)
    const [rows] = await db.query(
      'SELECT processingResult FROM AnimalPositions WHERE animalId=:id ORDER BY id DESC LIMIT 2',
      { replacements: { id: a.id } },
    )
    expect(rows.map((r) => r.processingResult)).toEqual(['future', 'historical'])
    const [history] = await db.query(
      "SELECT id FROM HistoryEvents WHERE resourceId=:id AND farmId=:farmId AND type='gps'",
      { replacements: { id: a.id, farmId: f.id } },
    )
    expect(history).toHaveLength(6)
    await c.other.agent.get(`/api/v1/animals/${a.id}`).expect(404)
    expect((await c.other.agent.get('/api/v1/map')).body).toEqual([])
  })
  it('retirado conserva hechos y no genera visitas nuevas; bebedero retirado no atribuye', async () => {
    await write(c.owner, 'delete', `/troughs/${t.id}`).expect(204)
    await submitSample(
      db,
      'animalPosition',
      {
        sourceKey: `no-trough:${a.id}`,
        resourceId: a.id,
        latitude: 0,
        longitude: 0,
        measuredAt: c.clock.now().toISOString(),
      },
      { environment: 'test' },
    )
    await createPositionProcessing(db, { clock: c.clock }).process()
    await write(c.owner, 'delete', `/animals/${a.id}`).expect(204)
    c.clock.advance(1000)
    await submitSample(
      db,
      'animalPosition',
      {
        sourceKey: `retired:${a.id}`,
        resourceId: a.id,
        latitude: 0,
        longitude: 0,
        measuredAt: c.clock.now().toISOString(),
      },
      { environment: 'test' },
    )
    await createPositionProcessing(db, { clock: c.clock }).process()
    const [rows] = await db.query(
      'SELECT processingResult FROM AnimalPositions WHERE sourceKey=:key',
      { replacements: { key: `retired:${a.id}` } },
    )
    expect(rows[0].processingResult).toBe('retired')
    const [visits] = await db.query('SELECT * FROM EstimatedVisits WHERE animalId=:id', {
      replacements: { id: a.id },
    })
    expect(visits).toHaveLength(2)
    expect((await c.owner.agent.get(`/api/v1/map?farmId=${f.id}`)).body).toEqual([])
  })
})
