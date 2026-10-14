import { beforeAll, afterAll, it, expect, vi } from 'vitest'
import {
  openIdentityDatabase,
  insertAccount,
  email,
} from '../helpers/identityFixtures.js'
import {
  monitoringContext,
  farmBody,
  write,
  fixtureInsert,
} from '../helpers/monitoringFixtures.js'
let db, c, f, w2
beforeAll(async () => {
  db = await openIdentityDatabase()
  c = await monitoringContext(db)
  f = (await write(c.owner, 'post', '/farms', farmBody)).body
  w2 = await insertAccount(db, {
    name: 'Otro peón',
    address: email('task-other'),
    role: 'worker',
  })
  for (const workerId of [c.worker.account.id, w2])
    await fixtureInsert(db, 'Assignments', {
      farmId: f.id,
      workerId,
      createdAt: c.clock.now(),
      updatedAt: c.clock.now(),
    })
}, 30000)
afterAll(async () => {
  c?.identity.close()
  await db?.close()
})
async function create() {
  return (
    await write(c.owner, 'post', `/farms/${f.id}/tasks`, {
      title: 'Reparar',
      description: 'Descripción',
      deadline: c.clock.now().toISOString(),
      workerId: c.worker.account.id,
    }).expect(201)
  ).body
}
it('solo una acción con igual versión; eventos y notificaciones atómicos', async () => {
  const t = await create()
  const results = await Promise.all(
    [1, 2].map(() =>
      write(c.worker, 'post', `/tasks/${t.id}/actions`, {
        action: 'start',
        expectedVersion: 1,
      }),
    ),
  )
  expect(results.map((r) => r.status).sort()).toEqual([200, 409])
  await write(c.worker, 'post', `/tasks/${t.id}/actions`, {
    action: 'submit',
    expectedVersion: 2,
  }).expect(200)
  await write(c.owner, 'post', `/tasks/${t.id}/actions`, {
    action: 'reject',
    expectedVersion: 3,
    reason: 'Revisar caño',
  }).expect(200)
  await write(c.worker, 'post', `/tasks/${t.id}/actions`, {
    action: 'submit',
    expectedVersion: 4,
  }).expect(200)
  await write(c.owner, 'post', `/tasks/${t.id}/actions`, {
    action: 'approve',
    expectedVersion: 5,
  }).expect(200)
  await write(c.owner, 'post', `/tasks/${t.id}/actions`, {
    action: 'assign',
    expectedVersion: 6,
    workerId: w2,
  }).expect(409)
  const [notes] = await db.query(
    'SELECT * FROM Notifications WHERE taskId=:id',
    { replacements: { id: t.id } },
  )
  expect(notes.map((n) => n.type)).toEqual(
    expect.arrayContaining(['created', 'reject', 'approve']),
  )
  const detail = (await c.owner.agent.get(`/api/v1/tasks/${t.id}`)).body
  expect(detail.events).toHaveLength(6)
})
it('reasignación preserva estado y atribución; antiguo responsable pierde acceso', async () => {
  const t = await create()
  await write(c.worker, 'post', `/tasks/${t.id}/actions`, {
    action: 'start',
    expectedVersion: 1,
  }).expect(200)
  const r = await write(c.owner, 'post', `/tasks/${t.id}/actions`, {
    action: 'assign',
    expectedVersion: 2,
    workerId: w2,
  }).expect(200)
  expect(r.body).toMatchObject({
    state: 'En progreso',
    workerId: w2,
    version: 3,
  })
  expect(r.body.events.at(-1)).toMatchObject({
    previousWorkerId: c.worker.account.id,
    newWorkerId: w2,
  })
  await c.worker.agent.get(`/api/v1/tasks/${t.id}`).expect(404)
})
it('revocación simultánea serializa y deja tarea abierta sin responsable; no avanza después', async () => {
  const t = await create()
  const [action, revocation] = await Promise.all([
    write(c.worker, 'post', `/tasks/${t.id}/actions`, {
      action: 'start',
      expectedVersion: 1,
    }),
    write(c.owner, 'put', `/team/${c.worker.account.id}/assignments`, {
      farmIds: [],
    }),
  ])
  expect([200, 404]).toContain(action.status)
  expect(revocation.status).toBe(200)
  const result = (await c.owner.agent.get(`/api/v1/tasks/${t.id}`).expect(200))
    .body
  expect(result.workerId).toBeNull()
  expect(result.version).toBe(action.status === 200 ? 3 : 2)
  await write(c.worker, 'post', `/tasks/${t.id}/actions`, {
    action: 'submit',
    expectedVersion: result.version,
  }).expect(404)
})
it('validación revocada exige reasignación y conserva estado e historial', async () => {
  await write(c.owner, 'put', `/team/${c.worker.account.id}/assignments`, {
    farmIds: [f.id],
  }).expect(200)
  const t = await create()
  await write(c.worker, 'post', `/tasks/${t.id}/actions`, {
    action: 'start',
    expectedVersion: 1,
  }).expect(200)
  await write(c.worker, 'post', `/tasks/${t.id}/actions`, {
    action: 'submit',
    expectedVersion: 2,
  }).expect(200)
  await write(c.owner, 'put', `/team/${c.worker.account.id}/assignments`, {
    farmIds: [],
  }).expect(200)
  const unavailable = await write(c.owner, 'post', `/tasks/${t.id}/actions`, {
    action: 'approve',
    expectedVersion: 4,
  }).expect(409)
  expect(unavailable.body.code).toBe('TASK_UNASSIGNED')
  const assigned = await write(c.owner, 'post', `/tasks/${t.id}/actions`, {
    action: 'assign',
    expectedVersion: 4,
    workerId: w2,
  }).expect(200)
  expect(assigned.body.state).toBe('Pendiente de validación')
  await write(c.owner, 'post', `/tasks/${t.id}/actions`, {
    action: 'approve',
    expectedVersion: 5,
  }).expect(200)
})

it('un fallo al notificar revierte tarea y eventos en la misma transacción', async () => {
  await write(c.owner, 'put', `/team/${c.worker.account.id}/assignments`, {
    farmIds: [f.id],
  }).expect(200)
  const original = db.query.bind(db)
  const spy = vi.spyOn(db, 'query').mockImplementation((sql, ...args) => {
    if (
      typeof sql === 'string' &&
      sql.startsWith('INSERT INTO `Notifications`')
    )
      throw Error('simulated storage failure')
    return original(sql, ...args)
  })
  try {
    await write(c.owner, 'post', `/farms/${f.id}/tasks`, {
      title: 'Rollback test',
      description: 'Debe revertir',
      deadline: c.clock.now().toISOString(),
      workerId: c.worker.account.id,
    }).expect(500)
  } finally {
    spy.mockRestore()
  }
  const [rows] = await db.query(
    "SELECT id FROM Tasks WHERE farmId=:farmId AND title='Rollback test'",
    { replacements: { farmId: f.id } },
  )
  expect(rows).toHaveLength(0)
})
