import { beforeAll, afterAll, it, expect } from 'vitest'
import {
  openIdentityDatabase,
  insertInvitation,
} from '../helpers/identityFixtures.js'
import {
  monitoringContext,
  farmBody,
  write,
  fixtureInsert,
} from '../helpers/monitoringFixtures.js'
let db, c, f
beforeAll(async () => {
  db = await openIdentityDatabase()
  c = await monitoringContext(db)
  f = (await write(c.owner, 'post', '/farms', farmBody)).body
}, 30000)
afterAll(async () => {
  c?.identity.close()
  await db?.close()
})
it('revocación conserva estado e historia completed; no requiere sustituto; repetición no reactiva', async () => {
  const inv = await insertInvitation(db, {
    ownerId: c.owner.account.id,
    address: c.worker.account.email,
    farmIds: [f.id],
    issuedAt: c.clock.now(),
  })
  await write(c.worker, 'post', '/invitations/accept', {
    token: inv.token,
  }).expect(200)
  const ids = []
  for (const state of [
    'Pendiente',
    'En progreso',
    'Pendiente de validación',
    'Completada',
  ])
    ids.push(
      await fixtureInsert(db, 'Tasks', {
        farmId: f.id,
        title: state,
        description: 'fixture',
        deadline: c.clock.now(),
        state,
        workerId: c.worker.account.id,
        createdAt: c.clock.now(),
        updatedAt: c.clock.now(),
      }),
    )
  await write(c.owner, 'put', `/team/${c.worker.account.id}/assignments`, {
    farmIds: [],
  }).expect(200)
  const [rows] = await db.query(
    'SELECT * FROM Tasks WHERE id IN (:ids) ORDER BY id',
    { replacements: { ids } },
  )
  expect(
    rows.slice(0, 3).every((t) => t.workerId === null && t.version === 2),
  ).toBe(true)
  expect(rows[2].state).toBe('Pendiente de validación')
  expect(rows[3]).toMatchObject({ workerId: c.worker.account.id, version: 1 })
  const [events] = await db.query(
    'SELECT * FROM TaskEvents WHERE taskId IN (:ids)',
    { replacements: { ids } },
  )
  expect(events).toHaveLength(3)
  expect(
    events.every(
      (e) =>
        e.previousWorkerId === c.worker.account.id && e.newWorkerId === null,
    ),
  ).toBe(true)
  await write(c.worker, 'post', '/invitations/accept', {
    token: inv.token,
  }).expect(200)
  await c.worker.agent.get(`/api/v1/map?farmId=${f.id}`).expect(404)
  await c.worker.agent.get(`/api/v1/farms/${f.id}`).expect(404)
})
