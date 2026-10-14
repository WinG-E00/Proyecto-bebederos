import { beforeAll, afterAll, it, expect } from 'vitest'
import { openIdentityDatabase } from '../helpers/identityFixtures.js'
import {
  monitoringContext,
  farmBody,
  write,
  fixtureInsert,
} from '../helpers/monitoringFixtures.js'
let db, c, f, task
const body = {
  title: 'Revisar flotante',
  description: 'Controlar funcionamiento',
  deadline: '2026-10-14T12:00:00.000Z',
}
beforeAll(async () => {
  db = await openIdentityDatabase()
  c = await monitoringContext(db)
  f = (await write(c.owner, 'post', '/farms', farmBody)).body
  await fixtureInsert(db, 'Assignments', {
    farmId: f.id,
    workerId: c.worker.account.id,
    createdAt: c.clock.now(),
    updatedAt: c.clock.now(),
  })
}, 30000)
afterAll(async () => {
  c?.identity.close()
  await db?.close()
})
it('crea solo con peón activo, filtra por dueño/peón y no admite campos extra', async () => {
  const r = await write(c.owner, 'post', `/farms/${f.id}/tasks`, {
    ...body,
    workerId: c.worker.account.id,
  }).expect(201)
  task = r.body
  expect(task).toMatchObject({
    state: 'Pendiente',
    priority: 'Media',
    version: 1,
    overdue: false,
    workerId: c.worker.account.id,
  })
  await c.worker.agent.get(`/api/v1/tasks/${task.id}`).expect(200)
  await c.other.agent.get(`/api/v1/tasks/${task.id}`).expect(404)
  expect((await c.other.agent.get('/api/v1/tasks')).body.total).toBe(0)
  await write(c.worker, 'post', `/farms/${f.id}/tasks`, {
    ...body,
    workerId: c.worker.account.id,
  }).expect(403)
  for (const extra of [
    { priority: 'Urgente' },
    { state: 'Completada' },
    { version: 100 },
    { workerId: c.other.account.id },
    { deadline: 'bad' },
    { title: ' ' },
  ])
    await write(c.owner, 'post', `/farms/${f.id}/tasks`, {
      ...body,
      workerId: c.worker.account.id,
      ...extra,
    }).expect(422)
  await c.owner.agent.get('/api/v1/tasks?state=Inventado').expect(422)
})
it('version obligatoria, permisos actuales y conflicto no sobrescribe', async () => {
  await write(c.worker, 'post', `/tasks/${task.id}/actions`, {
    action: 'start',
  }).expect(422)
  await write(c.owner, 'post', `/tasks/${task.id}/actions`, {
    action: 'start',
    expectedVersion: 1,
  }).expect(403)
  expect(
    (
      await write(c.worker, 'post', `/tasks/${task.id}/actions`, {
        action: 'start',
        expectedVersion: 1,
      }).expect(200)
    ).body.state,
  ).toBe('En progreso')
  const stale = await write(c.worker, 'post', `/tasks/${task.id}/actions`, {
    action: 'submit',
    expectedVersion: 1,
  }).expect(409)
  expect(stale.body.code).toBe('STALE_TASK')
  await write(c.worker, 'post', `/tasks/${task.id}/actions`, {
    action: 'submit',
    expectedVersion: 2,
  }).expect(200)
  await write(c.owner, 'post', `/tasks/${task.id}/actions`, {
    action: 'reject',
    expectedVersion: 3,
    reason: ' ',
  }).expect(422)
  await write(c.owner, 'post', `/tasks/${task.id}/actions`, {
    action: 'reject',
    expectedVersion: 3,
    reason: 'Falta limpieza',
  }).expect(200)
  const detail = (await c.owner.agent.get(`/api/v1/tasks/${task.id}`)).body
  expect(detail.events.at(-1)).toMatchObject({
    comment: 'Falta limpieza',
    previousWorkerId: c.worker.account.id,
  })
})
