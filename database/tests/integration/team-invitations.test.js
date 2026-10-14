import { beforeAll, afterAll, it, expect } from 'vitest'
import {
  openIdentityDatabase,
  lastMailToken,
  email,
} from '../helpers/identityFixtures.js'
import {
  monitoringContext,
  farmBody,
  write,
} from '../helpers/monitoringFixtures.js'
import { createMailWorker } from '../../workers/mail.worker.js'
let db, c, f, g
beforeAll(async () => {
  db = await openIdentityDatabase()
  c = await monitoringContext(db)
  f = (await write(c.owner, 'post', '/farms', farmBody)).body
  g = (await write(c.other, 'post', '/farms', farmBody)).body
}, 30000)
afterAll(async () => {
  c?.identity.close()
  await db?.close()
})
it('mismo peón acepta a varios dueños; plazo exacto y retiro cancelan payload', async () => {
  for (const [s, farm] of [
    [c.owner, f],
    [c.other, g],
  ]) {
    await write(s, 'post', '/invitations', {
      email: c.worker.account.email,
      farmIds: [farm.id],
    }).expect(201)
    const token = await lastMailToken(
      db,
      c.mail,
      c.worker.account.email,
      'invitation',
    )
    await write(c.worker, 'post', '/invitations/accept', { token }).expect(200)
  }
  await write(c.owner, 'put', `/team/${c.worker.account.id}/assignments`, {
    farmIds: [],
  }).expect(200)
  await c.worker.agent.get(`/api/v1/farms/${g.id}`).expect(200)
  const r = await write(c.owner, 'post', '/invitations', {
    email: email('expire'),
    farmIds: [f.id],
  }).expect(201)
  const token = await lastMailToken(db, c.mail, r.body.email, 'invitation')
  c.clock.advance(7 * 86400000)
  expect(
    (await c.owner.agent.get(`/api/v1/invitations/preview?token=${token}`))
      .body,
  ).toMatchObject({ valid: false, reason: 'expired' })
  // Persist expiration through the worker, even without a browser.
  const { createInvitationsWorker } =
    await import('../../workers/invitations.worker.js')
  await createInvitationsWorker(db, { clock: c.clock }).process()
  const [rows] = await db.query(
    'SELECT state,encryptedPayload FROM MailOutbox WHERE invitationId=:id',
    { replacements: { id: r.body.id } },
  )
  expect(rows[0]).toMatchObject({ state: 'expired', encryptedPayload: null })
})
it('fallo SMTP, reintento mantiene token y plazo; retirado no se envía', async () => {
  const r = await write(c.owner, 'post', '/invitations', {
    email: email('smtp'),
    farmIds: [f.id],
  }).expect(201)
  const token = await lastMailToken(db, c.mail, r.body.email, 'invitation')
  // Scope the queue to this invitation; other test messages are expired first.
  await db.query(
    "UPDATE MailOutbox SET state='expired',encryptedPayload=NULL WHERE state IN ('pending','failed') AND (invitationId IS NULL OR invitationId<>:id)",
    { replacements: { id: r.body.id } },
  )
  const worker = createMailWorker(db, {
    mail: c.mail,
    clock: c.clock,
    from: 'test@test.invalid',
    transport: {
      sendMail: async () => {
        throw Error('simulated')
      },
    },
  })
  for (const delay of [0, 60000, 120000, 240000]) {
    c.clock.advance(delay)
    await worker.processNext()
  }
  const retry = await write(
    c.owner,
    'post',
    `/invitations/${r.body.id}/retry`,
    {},
  ).expect(200)
  expect(retry.body.expiresAt).toBe(r.body.expiresAt)
  expect(await lastMailToken(db, c.mail, r.body.email, 'invitation')).toBe(
    token,
  )
  await write(c.owner, 'delete', `/invitations/${r.body.id}`).expect(204)
  expect(
    (await c.owner.agent.get(`/api/v1/invitations/preview?token=${token}`)).body
      .reason,
  ).toBe('withdrawn')
  let sent = false
  await createMailWorker(db, {
    mail: c.mail,
    clock: c.clock,
    from: 'test@test.invalid',
    transport: {
      sendMail: async () => {
        sent = true
        return { accepted: [r.body.email] }
      },
    },
  }).processNext()
  expect(sent).toBe(false)
})
it('un campo retirado deja el enlace sin acceso y sin asignaciones nuevas', async () => {
  const farm = (await write(c.owner, 'post', '/farms', farmBody)).body
  const r = await write(c.owner, 'post', '/invitations', {
    email: c.worker.account.email,
    farmIds: [farm.id],
  }).expect(201)
  const token = await lastMailToken(db, c.mail, r.body.email, 'invitation')
  await write(c.owner, 'delete', `/farms/${farm.id}`).expect(204)
  expect(
    (await c.owner.agent.get(`/api/v1/invitations/preview?token=${token}`))
      .body,
  ).toEqual({ valid: false, reason: 'no_farms' })
  await write(c.worker, 'post', '/invitations/accept', { token }).expect(409)
  const [rows] = await db.query('SELECT * FROM Assignments WHERE farmId=:id', {
    replacements: { id: farm.id },
  })
  expect(rows).toHaveLength(0)
})
