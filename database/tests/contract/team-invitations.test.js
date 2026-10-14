import { beforeAll, afterAll, it, expect } from 'vitest'
import {
  openIdentityDatabase,
  lastMailToken,
  insertAccount,
  email,
} from '../helpers/identityFixtures.js'
import {
  monitoringContext,
  farmBody,
  write,
} from '../helpers/monitoringFixtures.js'
let db, c, f, other, worker
beforeAll(async () => {
  db = await openIdentityDatabase()
  c = await monitoringContext(db)
  f = (await write(c.owner, 'post', '/farms', farmBody)).body
  other = (await write(c.other, 'post', '/farms', farmBody)).body
  worker = c.worker.account
}, 30000)
afterAll(async () => {
  c?.identity.close()
  await db?.close()
})
it('emite correo cifrado sin conceder acceso ni exponer secretos; valida dueño y campos', async () => {
  const r = await write(c.owner, 'post', '/invitations', {
    email: worker.email,
    farmIds: [f.id],
  }).expect(201)
  expect(JSON.stringify(r.body)).not.toMatch(/token|hash/i)
  expect(r.body).toMatchObject({
    state: 'Pendiente',
    deliveryState: 'Pendiente',
    farmIds: [f.id],
  })
  await c.worker.agent.get(`/api/v1/farms/${f.id}`).expect(404)
  const token = await lastMailToken(db, c.mail, worker.email, 'invitation')
  expect(token).toBeTruthy()
  await write(c.worker, 'post', '/invitations/accept', { token }).expect(200)
  await c.worker.agent.get(`/api/v1/farms/${f.id}`).expect(200)
  expect(
    (await c.owner.agent.get('/api/v1/team').expect(200)).body.items,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: worker.id, farmIds: [f.id] }),
    ]),
  )
  await write(c.owner, 'post', '/invitations', {
    email: worker.email,
    farmIds: [other.id],
  }).expect(404)
  await write(c.worker, 'post', '/invitations', {
    email: worker.email,
    farmIds: [f.id],
  }).expect(403)
  await write(c.owner, 'post', '/invitations', {
    email: c.other.account.email,
    farmIds: [f.id],
  }).expect(422)
  await write(c.owner, 'post', '/invitations', {
    email: worker.email,
    farmIds: [],
    token: 'bad',
  }).expect(422)
  await write(c.owner, 'put', `/team/${worker.id}/assignments`, {
    farmIds: [other.id],
  }).expect(404)
  await write(c.owner, 'put', `/team/${worker.id}/assignments`, {
    farmIds: [],
  }).expect(200)
  await write(c.worker, 'post', '/invitations/accept', { token }).expect(200)
  await c.worker.agent.get(`/api/v1/farms/${f.id}`).expect(404)
})
it('lista paginada, retiro propio y reintento restringido', async () => {
  const r = await write(c.owner, 'post', '/invitations', {
    email: email('withdraw'),
    farmIds: [f.id],
  }).expect(201)
  await write(c.other, 'delete', `/invitations/${r.body.id}`).expect(404)
  await write(c.owner, 'post', `/invitations/${r.body.id}/retry`, {}).expect(
    409,
  )
  await write(c.owner, 'delete', `/invitations/${r.body.id}`).expect(204)
  const list = (
    await c.owner.agent.get('/api/v1/invitations?limit=1').expect(200)
  ).body
  expect(list).toMatchObject({ page: 1, limit: 1 })
  expect(list.items).toHaveLength(1)
  const unknown = await insertAccount(db, {
    name: 'unknown',
    address: email('unknown'),
    role: 'worker',
  })
  await write(c.owner, 'put', `/team/${unknown}/assignments`, {
    farmIds: [f.id],
  }).expect(404)
})
