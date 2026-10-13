import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { QueryTypes } from 'sequelize'
import {
  PASSWORD, assignments, buildIdentityApp, csrfAgent, email, insertAccount, insertFarm, insertInvitation,
  lastMailToken, loginAgent, openIdentityDatabase, post, retireTestMail, testDatabaseAvailable,
} from '../helpers/identityFixtures.js'

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

describe.skipIf(!testDatabaseAvailable())('identidad, sesiones e invitaciones (US1)', () => {
  let db; let ctx

  beforeAll(async () => { db = await openIdentityDatabase(); ctx = buildIdentityApp(db) }, 30000)
  afterAll(async () => { ctx?.identity.close(); if (db) await retireTestMail(db); await db?.close() })

  // Dos dueños con campos propios; el mismo peón puede ser invitado por ambos.
  async function fixtures(label) {
    const ownerA = await insertAccount(db, { name: 'Dueño A', address: email(`${label}-owner-a`), role: 'owner' })
    const ownerB = await insertAccount(db, { name: 'Dueño B', address: email(`${label}-owner-b`), role: 'owner' })
    return {
      ownerA, ownerB, ownerAEmail: email(`${label}-owner-a`), workerEmail: email(`${label}-worker`),
      farmA1: await insertFarm(db, { ownerId: ownerA, name: 'A1' }),
      farmA2: await insertFarm(db, { ownerId: ownerA, name: 'A2' }),
      farmA3: await insertFarm(db, { ownerId: ownerA, name: 'A3 no invitado' }),
      farmB1: await insertFarm(db, { ownerId: ownerB, name: 'B1' }),
    }
  }
  const invite = (f, ownerId, farmIds, options = {}) => insertInvitation(db, { ownerId, address: f.workerEmail, farmIds, issuedAt: ctx.clock.now(), ...options })

  async function registerWorker(address, token) {
    const response = await post(await csrfAgent(request, ctx.app), '/api/v1/auth/register', { name: 'Peón', email: address, password: PASSWORD, invitationToken: token })
    expect(response.status).toBe(201)
    return response.body.account
  }

  describe('verificación del dueño', () => {
    it('no inicia sesión sin verificar y el enlace vence exactamente a las 24 horas', async () => {
      const address = email('verify-expiry')
      const session = await csrfAgent(request, ctx.app)
      await post(session, '/api/v1/auth/register', { name: 'Ana', email: address, password: PASSWORD }).expect(202)
      const login = await post(session, '/api/v1/auth/login', { email: address, password: PASSWORD })
      expect([login.status, login.body.code]).toEqual([403, 'EMAIL_NOT_VERIFIED'])
      const token = await lastMailToken(db, ctx.mail, address, 'verification')
      ctx.clock.advance(DAY)
      try {
        expect((await post(session, '/api/v1/auth/verify', { token })).status).toBe(422)
      } finally { ctx.clock.advance(-DAY) }
    })

    it('reenviar la verificación invalida el enlace anterior', async () => {
      const address = email('resend')
      const session = await csrfAgent(request, ctx.app)
      await post(session, '/api/v1/auth/register', { name: 'Ana', email: address, password: PASSWORD }).expect(202)
      const first = await lastMailToken(db, ctx.mail, address, 'verification')
      await post(session, '/api/v1/auth/resend-verification', { email: address }).expect(202)
      const second = await lastMailToken(db, ctx.mail, address, 'verification')
      expect(second).not.toBe(first)
      expect((await post(session, '/api/v1/auth/verify', { token: first })).status).toBe(422)
      await post(session, '/api/v1/auth/verify', { token: second }).expect(204)
      await loginAgent(request, ctx.app, address)
    })

    it('guarda los tokens como hash y el correo pendiente cifrado', async () => {
      const address = email('hashes')
      await post(await csrfAgent(request, ctx.app), '/api/v1/auth/register', { name: 'Ana', email: address, password: PASSWORD }).expect(202)
      const token = await lastMailToken(db, ctx.mail, address, 'verification')
      const [row] = await db.query(
        'SELECT t.tokenHash, o.encryptedPayload FROM IdentityTokens t JOIN Accounts a ON a.id = t.accountId JOIN MailOutbox o ON o.identityTokenId = t.id WHERE a.email = :address',
        { replacements: { address }, type: QueryTypes.SELECT },
      )
      expect(row.tokenHash).toMatch(/^[a-f0-9]{64}$/)
      expect(row.tokenHash).not.toContain(token)
      expect(row.encryptedPayload).not.toContain(token)
    })
  })

  describe('recuperación de contraseña', () => {
    it('el enlace vence exactamente a los 30 minutos', async () => {
      const address = email('reset-expiry')
      await insertAccount(db, { name: 'Ana', address, role: 'owner' })
      const session = await csrfAgent(request, ctx.app)
      await post(session, '/api/v1/auth/forgot', { email: address }).expect(202)
      const token = await lastMailToken(db, ctx.mail, address, 'recovery')
      ctx.clock.advance(30 * MINUTE)
      try {
        expect((await post(session, '/api/v1/auth/reset', { token, password: 'nueva-clave-segura' })).status).toBe(422)
      } finally { ctx.clock.advance(-30 * MINUTE) }
    })

    it('una nueva solicitud invalida el enlace anterior', async () => {
      const address = email('reset-twice')
      await insertAccount(db, { name: 'Ana', address, role: 'owner' })
      const session = await csrfAgent(request, ctx.app)
      await post(session, '/api/v1/auth/forgot', { email: address })
      const first = await lastMailToken(db, ctx.mail, address, 'recovery')
      await post(session, '/api/v1/auth/forgot', { email: address })
      expect((await post(session, '/api/v1/auth/reset', { token: first, password: 'nueva-clave-segura' })).status).toBe(422)
    })

    it('cambiar la contraseña invalida todas las sesiones abiertas de esa cuenta y no otras', async () => {
      const address = email('reset-sessions')
      const other = email('reset-bystander')
      await insertAccount(db, { name: 'Ana', address, role: 'owner' })
      await insertAccount(db, { name: 'Otra', address: other, role: 'owner' })
      const desktop = await loginAgent(request, ctx.app, address)
      const phone = await loginAgent(request, ctx.app, address)
      const bystander = await loginAgent(request, ctx.app, other)
      const session = await csrfAgent(request, ctx.app)
      await post(session, '/api/v1/auth/forgot', { email: address })
      await post(session, '/api/v1/auth/reset', { token: await lastMailToken(db, ctx.mail, address, 'recovery'), password: 'nueva-clave-segura' }).expect(204)
      await desktop.agent.get('/api/v1/auth/me').expect(401)
      await phone.agent.get('/api/v1/auth/me').expect(401)
      await bystander.agent.get('/api/v1/auth/me').expect(200)
      expect((await post(session, '/api/v1/auth/login', { email: address, password: PASSWORD })).status).toBe(401)
    })
  })

  describe('cookies y sesiones SQL', () => {
    it('login rota cookie y CSRF: el token anónimo deja de servir', async () => {
      const address = email('rotate')
      await insertAccount(db, { name: 'Ana', address, role: 'owner' })
      const anonymous = await csrfAgent(request, ctx.app)
      const before = (await anonymous.agent.get('/api/v1/auth/csrf')).headers['set-cookie']
      const login = await post(anonymous, '/api/v1/auth/login', { email: address, password: PASSWORD }).expect(200)
      const cookie = login.headers['set-cookie']?.join(';') ?? ''
      expect(cookie).toMatch(/bebederos\.sid=/)
      expect(cookie).toMatch(/HttpOnly/i)
      expect(cookie).not.toBe(before?.join(';'))
      expect((await anonymous.agent.patch('/api/v1/profile').set('X-CSRF-Token', anonymous.csrf).send({ name: 'X' })).status).toBe(403)
    })

    it('la sesión vive en MySQL: retirarla corta el acceso en la solicitud siguiente', async () => {
      const address = email('stored')
      const accountId = await insertAccount(db, { name: 'Ana', address, role: 'owner' })
      const session = await loginAgent(request, ctx.app, address)
      const where = "CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.accountId')) AS UNSIGNED) = :accountId"
      const rows = await db.query(`SELECT sid, expires FROM Sessions WHERE ${where}`, { replacements: { accountId }, type: QueryTypes.SELECT })
      expect(rows).toHaveLength(1)
      const ttl = new Date(rows[0].expires).getTime() - Date.now()
      expect(ttl).toBeGreaterThan(DAY - 5 * MINUTE)
      expect(ttl).toBeLessThanOrEqual(DAY)
      await session.agent.get('/api/v1/auth/me').expect(200)
      await db.query(`DELETE FROM Sessions WHERE ${where}`, { replacements: { accountId } })
      await session.agent.get('/api/v1/auth/me').expect(401)
    })

    it('el rol se lee de MySQL en cada solicitud, no de la sesión', async () => {
      const address = email('role-source')
      await insertAccount(db, { name: 'Ana', address, role: 'owner' })
      const session = await loginAgent(request, ctx.app, address)
      await db.query('UPDATE Accounts SET name = :name WHERE email = :address', { replacements: { name: 'Nombre desde MySQL', address } })
      expect((await session.agent.get('/api/v1/auth/me')).body.account.name).toBe('Nombre desde MySQL')
    })
  })

  describe('invitación preparada por fixture', () => {
    it('el enlace verifica al peón pero no concede asignaciones hasta la aceptación explícita', async () => {
      const f = await fixtures('explicit')
      const { token } = await invite(f, f.ownerA, [f.farmA1, f.farmA2])
      const account = await registerWorker(f.workerEmail, token)
      expect(await assignments(db, account.id)).toEqual([])
      const worker = await loginAgent(request, ctx.app, f.workerEmail)
      const accepted = await post(worker, '/api/v1/invitations/accept', { token }).expect(200)
      expect(accepted.body).toEqual({ accepted: true, farmIds: [f.farmA1, f.farmA2] })
      expect(await assignments(db, account.id)).toEqual([{ farmId: f.farmA1, active: true }, { farmId: f.farmA2, active: true }])
      const [row] = await db.query('SELECT state, acceptedById FROM Invitations WHERE tokenHash IS NOT NULL AND acceptedById = :id', { replacements: { id: account.id }, type: QueryTypes.SELECT })
      expect(row.state).toBe('Aceptada')
    })

    it('aceptar de nuevo no duplica ni reactiva asignaciones revocadas después', async () => {
      const f = await fixtures('repeat')
      const { token } = await invite(f, f.ownerA, [f.farmA1])
      const account = await registerWorker(f.workerEmail, token)
      const worker = await loginAgent(request, ctx.app, f.workerEmail)
      await post(worker, '/api/v1/invitations/accept', { token }).expect(200)
      await db.query('UPDATE Assignments SET active = FALSE, revokedAt = :now WHERE workerId = :id', { replacements: { now: ctx.clock.now(), id: account.id } })
      const again = await post(worker, '/api/v1/invitations/accept', { token }).expect(200)
      expect(again.body).toEqual({ accepted: true, farmIds: [] })
      expect(await assignments(db, account.id)).toEqual([{ farmId: f.farmA1, active: false }])
    })

    it('acumula invitaciones de dos dueños sin incluir campos no invitados', async () => {
      const f = await fixtures('two-owners')
      const fromA = await invite(f, f.ownerA, [f.farmA1])
      const fromB = await invite(f, f.ownerB, [f.farmB1])
      const account = await registerWorker(f.workerEmail, fromA.token)
      const worker = await loginAgent(request, ctx.app, f.workerEmail)
      await post(worker, '/api/v1/invitations/accept', { token: fromA.token }).expect(200)
      await post(worker, '/api/v1/invitations/accept', { token: fromB.token }).expect(200)
      expect((await assignments(db, account.id)).map((row) => row.farmId)).toEqual([f.farmA1, f.farmB1])
    })

    it('vence exactamente a los siete días; un instante antes todavía se acepta', async () => {
      const f = await fixtures('expiry')
      const issuedAt = ctx.clock.now()
      const late = await invite(f, f.ownerA, [f.farmA1], { issuedAt })
      const onTime = await invite(f, f.ownerA, [f.farmA2], { issuedAt })
      const account = await registerWorker(f.workerEmail, late.token)
      const worker = await loginAgent(request, ctx.app, f.workerEmail)
      ctx.clock.set(new Date(issuedAt.getTime() + 7 * DAY - 1))
      try {
        await post(worker, '/api/v1/invitations/accept', { token: onTime.token }).expect(200)
        ctx.clock.set(new Date(issuedAt.getTime() + 7 * DAY))
        const expired = await post(worker, '/api/v1/invitations/accept', { token: late.token })
        expect([expired.status, expired.body.code]).toEqual([409, 'INVITATION_EXPIRED'])
        expect(await assignments(db, account.id)).toEqual([{ farmId: f.farmA2, active: true }])
        expect((await request(ctx.app).get('/api/v1/invitations/preview').query({ token: late.token })).body).toEqual({ valid: false, reason: 'expired' })
      } finally { ctx.clock.set(issuedAt) }
    })

    it('rechaza dueño, otro destinatario, invitación retirada y campos retirados sin conceder acceso', async () => {
      const f = await fixtures('reject')
      const toOwner = await insertInvitation(db, { ownerId: f.ownerB, address: f.ownerAEmail, farmIds: [f.farmB1], issuedAt: ctx.clock.now() })
      const owner = await loginAgent(request, ctx.app, f.ownerAEmail)
      const ownerTry = await post(owner, '/api/v1/invitations/accept', { token: toOwner.token })
      expect([ownerTry.status, ownerTry.body.code]).toEqual([403, 'ROLE_INCOMPATIBLE'])

      const mine = await invite(f, f.ownerA, [f.farmA1])
      const other = await insertInvitation(db, { ownerId: f.ownerA, address: email('reject-other'), farmIds: [f.farmA2], issuedAt: ctx.clock.now() })
      const withdrawn = await invite(f, f.ownerA, [f.farmA2], { state: 'Retirada' })
      const retired = await insertFarm(db, { ownerId: f.ownerA, name: 'Retirado', deletedAt: ctx.clock.now() })
      const noFarms = await invite(f, f.ownerA, [retired])
      const account = await registerWorker(f.workerEmail, mine.token)
      const worker = await loginAgent(request, ctx.app, f.workerEmail)

      for (const [token, status, code] of [
        [other.token, 403, 'INVITATION_EMAIL_MISMATCH'],
        [withdrawn.token, 409, 'INVITATION_WITHDRAWN'],
        [noFarms.token, 409, 'INVITATION_NO_FARMS'],
        ['y'.repeat(43), 404, 'INVITATION_NOT_FOUND'],
      ]) {
        const response = await post(worker, '/api/v1/invitations/accept', { token })
        expect([response.status, response.body.code]).toEqual([status, code])
      }
      expect(await assignments(db, account.id)).toEqual([])
      expect((await owner.agent.get('/api/v1/auth/me')).body.account.role).toBe('owner')
    })

    it('el registro de peón con invitación vencida, retirada o de otro correo no crea la cuenta', async () => {
      const f = await fixtures('register-reject')
      const expired = await invite(f, f.ownerA, [f.farmA1], { issuedAt: new Date(ctx.clock.now().getTime() - 7 * DAY) })
      const withdrawn = await invite(f, f.ownerA, [f.farmA1], { state: 'Retirada' })
      const valid = await invite(f, f.ownerA, [f.farmA1])
      for (const [address, token] of [[f.workerEmail, expired.token], [f.workerEmail, withdrawn.token], [email('register-intruder'), valid.token]]) {
        const response = await post(await csrfAgent(request, ctx.app), '/api/v1/auth/register', { name: 'Peón', email: address, password: PASSWORD, invitationToken: token })
        expect([response.status, response.body.code]).toEqual([422, 'INVITATION_INVALID'])
        const rows = await db.query('SELECT id FROM Accounts WHERE email = :address', { replacements: { address }, type: QueryTypes.SELECT })
        expect(rows).toHaveLength(0)
      }
    })
  })

  describe('aislamiento', () => {
    it('/auth/me y /profile solo exponen y modifican la cuenta de la propia sesión', async () => {
      const f = await fixtures('isolation')
      const a = await loginAgent(request, ctx.app, f.ownerAEmail)
      const b = await loginAgent(request, ctx.app, email('isolation-owner-b'))
      expect((await a.agent.get('/api/v1/auth/me')).body.account.id).toBe(f.ownerA)
      const updated = await b.agent.patch('/api/v1/profile').set('X-CSRF-Token', b.csrf).send({ name: 'B cambiado' }).expect(200)
      expect(updated.body.account.id).toBe(f.ownerB)
      expect((await a.agent.get('/api/v1/auth/me')).body.account.name).toBe('Dueño A')
    })
  })
})
