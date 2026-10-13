import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { QueryTypes } from 'sequelize'
import {
  PASSWORD, buildIdentityApp, countMail, csrfAgent, email, insertAccount, insertFarm, insertInvitation,
  lastMailToken, loginAgent, openIdentityDatabase, post, retireTestMail, testDatabaseAvailable,
} from '../helpers/identityFixtures.js'

// Contrato `/api/v1` de acceso y perfil (contracts/api.md, «Acceso y perfil»).
const ACCOUNT_KEYS = ['email', 'id', 'name', 'role']
const SENSITIVE = /passwordHash|tokenHash|\$2[aby]\$|SELECT |INSERT |\.js:\d+/

function expectError(response, status, code) {
  expect(response.status).toBe(status)
  expect(response.body).toMatchObject({ code, message: expect.any(String) })
  expect(JSON.stringify(response.body)).not.toMatch(SENSITIVE)
}

describe.skipIf(!testDatabaseAvailable())('contrato de acceso y perfil', () => {
  let db; let ctx

  beforeAll(async () => { db = await openIdentityDatabase(); ctx = buildIdentityApp(db) }, 30000)
  afterAll(async () => { ctx?.identity.close(); if (db) await retireTestMail(db); await db?.close() })

  it('GET /auth/csrf entrega un token ligado a una cookie HttpOnly, SameSite=Lax y 24 h', async () => {
    const response = await request(ctx.app).get('/api/v1/auth/csrf').expect(200)
    expect(response.body).toEqual({ csrfToken: expect.stringMatching(/^[A-Za-z0-9_-]{32,}$/) })
    const cookie = response.headers['set-cookie']?.join(';') ?? ''
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).not.toMatch(/Secure/i) // solo producción
    expect(response.headers['cache-control']).toMatch(/no-store/)
  })

  it('toda escritura sin X-CSRF-Token de la propia sesión responde 403', async () => {
    const session = await csrfAgent(request, ctx.app)
    expectError(await session.agent.post('/api/v1/auth/login').send({ email: email('x'), password: PASSWORD }), 403, 'CSRF_INVALID')
    expectError(await post({ ...session, csrf: 'otro-token' }, '/api/v1/auth/login', { email: email('x'), password: PASSWORD }), 403, 'CSRF_INVALID')
    const other = await csrfAgent(request, ctx.app)
    expectError(await post({ agent: session.agent, csrf: other.csrf }, '/api/v1/auth/login', { email: email('x'), password: PASSWORD }), 403, 'CSRF_INVALID')
  })

  describe('POST /auth/register', () => {
    it('el registro público crea siempre un dueño pendiente de verificación y encola el correo', async () => {
      const address = email('owner-register')
      const response = await post(await csrfAgent(request, ctx.app), '/api/v1/auth/register', { name: 'Ana Dueña', email: `  ${address.toUpperCase()} `, password: PASSWORD })
      expect(response.status).toBe(202)
      expect(response.body).toEqual({ account: null, needsVerification: true })
      const [row] = await db.query('SELECT role, emailVerifiedAt FROM Accounts WHERE email = :address', { replacements: { address }, type: QueryTypes.SELECT })
      expect(row).toEqual({ role: 'owner', emailVerifiedAt: null })
      expect(await lastMailToken(db, ctx.mail, address, 'verification')).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    })

    it.each([[{ role: 'worker' }], [{ role: 'owner' }], [{ ownerId: 1 }], [{ emailVerifiedAt: '2026-01-01T00:00:00Z' }], [{ perfilId: 2 }]])(
      'el rol no es elegible por el cliente: rechaza %j con 422 sin crear cuenta', async (extra) => {
        const address = email(`extra-${Object.keys(extra)[0]}`)
        const response = await post(await csrfAgent(request, ctx.app), '/api/v1/auth/register', { name: 'Intruso', email: address, password: PASSWORD, ...extra })
        expectError(response, 422, 'VALIDATION_ERROR')
        const rows = await db.query('SELECT id FROM Accounts WHERE email = :address', { replacements: { address }, type: QueryTypes.SELECT })
        expect(rows).toHaveLength(0)
      })

    it.each([
      ['contraseña corta', { password: 'corta1234' }],
      ['contraseña de más de 72 bytes', { password: 'ñ'.repeat(37) }],
      ['correo inválido', { email: 'no-es-correo' }],
      ['nombre vacío', { name: '   ' }],
    ])('valida %s con 422, campos señalados y sin reflejar valores', async (_label, override) => {
      const response = await post(await csrfAgent(request, ctx.app), '/api/v1/auth/register', { name: 'Ana', email: email('valid'), password: PASSWORD, ...override })
      expectError(response, 422, 'VALIDATION_ERROR')
      expect(Object.keys(response.body.fields)).toEqual([Object.keys(override)[0]])
      if (override.password) expect(JSON.stringify(response.body)).not.toContain(override.password)
    })

    it('un correo ya registrado recibe la misma respuesta genérica y ningún correo nuevo', async () => {
      const address = email('existing')
      await insertAccount(db, { name: 'Existente', address, role: 'owner' })
      const response = await post(await csrfAgent(request, ctx.app), '/api/v1/auth/register', { name: 'Ana', email: address, password: PASSWORD })
      expect(response.status).toBe(202)
      expect(response.body).toEqual({ account: null, needsVerification: true })
      expect(await countMail(db, address)).toBe(0)
    })

    it('con invitación vigente del mismo correo crea un peón verificado y sin asignaciones', async () => {
      const ownerId = await insertAccount(db, { name: 'Dueño', address: email('inv-owner'), role: 'owner' })
      const farmId = await insertFarm(db, { ownerId, name: 'Campo' })
      const address = email('inv-worker')
      const { token } = await insertInvitation(db, { ownerId, address, farmIds: [farmId], issuedAt: ctx.clock.now() })
      const response = await post(await csrfAgent(request, ctx.app), '/api/v1/auth/register', { name: 'Pedro Peón', email: address, password: PASSWORD, invitationToken: token })
      expect(response.status).toBe(201)
      expect(response.body.needsVerification).toBe(false)
      expect(Object.keys(response.body.account).sort()).toEqual(ACCOUNT_KEYS)
      expect(response.body.account).toMatchObject({ role: 'worker', email: address })
      const rows = await db.query('SELECT id FROM Assignments WHERE workerId = :id', { replacements: { id: response.body.account.id }, type: QueryTypes.SELECT })
      expect(rows).toHaveLength(0)
    })
  })

  describe('POST /auth/login, GET /auth/me y POST /auth/logout', () => {
    const address = email('session-owner')
    beforeAll(async () => { await insertAccount(db, { name: 'Ana', address, role: 'owner' }) })

    it('login regenera la sesión y devuelve cuenta sin datos sensibles y nuevo token CSRF', async () => {
      const anonymous = await csrfAgent(request, ctx.app)
      const response = await post(anonymous, '/api/v1/auth/login', { email: address.toUpperCase(), password: PASSWORD }).expect(200)
      expect(Object.keys(response.body).sort()).toEqual(['account', 'csrfToken'])
      expect(Object.keys(response.body.account).sort()).toEqual(ACCOUNT_KEYS)
      expect(response.body.csrfToken).not.toBe(anonymous.csrf)
      expect(JSON.stringify(response.body)).not.toMatch(SENSITIVE)
      expect((await anonymous.agent.get('/api/v1/auth/me').expect(200)).body).toEqual({ account: response.body.account })
    })

    it('credenciales inválidas y cuentas inexistentes reciben la misma respuesta', async () => {
      const session = await csrfAgent(request, ctx.app)
      const wrong = await post(session, '/api/v1/auth/login', { email: address, password: 'otra-clave-123' })
      const missing = await post(session, '/api/v1/auth/login', { email: email('nobody'), password: 'otra-clave-123' })
      expectError(wrong, 401, 'INVALID_CREDENTIALS')
      expect([missing.status, missing.body]).toEqual([wrong.status, wrong.body])
    })

    it('GET /auth/me sin sesión responde 401', async () => {
      expectError(await request(ctx.app).get('/api/v1/auth/me'), 401, 'UNAUTHENTICATED')
    })

    it('logout exige CSRF, invalida sesión y cookie y obliga a autenticarse otra vez', async () => {
      const session = await loginAgent(request, ctx.app, address)
      expectError(await session.agent.post('/api/v1/auth/logout'), 403, 'CSRF_INVALID')
      const response = await post(session, '/api/v1/auth/logout', {}).expect(204)
      expect(response.headers['set-cookie']?.join(';')).toMatch(/bebederos\.sid=;/)
      expectError(await session.agent.get('/api/v1/auth/me'), 401, 'UNAUTHENTICATED')
    })
  })

  describe('POST /auth/verify, /auth/resend-verification, /auth/forgot y /auth/reset', () => {
    it('verify consume el enlace una única vez y responde 204', async () => {
      const address = email('verify')
      const session = await csrfAgent(request, ctx.app)
      await post(session, '/api/v1/auth/register', { name: 'Ana', email: address, password: PASSWORD }).expect(202)
      const token = await lastMailToken(db, ctx.mail, address, 'verification')
      await post(session, '/api/v1/auth/verify', { token }).expect(204)
      expectError(await post(session, '/api/v1/auth/verify', { token }), 422, 'TOKEN_INVALID')
    })

    it('resend-verification y forgot son genéricos para cuentas ausentes', async () => {
      const session = await csrfAgent(request, ctx.app)
      const nobody = email('ghost')
      for (const path of ['/api/v1/auth/resend-verification', '/api/v1/auth/forgot']) {
        const response = await post(session, path, { email: nobody })
        expect([response.status, response.body]).toEqual([202, { accepted: true }])
      }
      expect(await countMail(db, nobody)).toBe(0)
    })

    it('reset cambia la contraseña con un token de recuperación de un solo uso', async () => {
      const address = email('reset')
      await insertAccount(db, { name: 'Ana', address, role: 'owner' })
      const session = await csrfAgent(request, ctx.app)
      await post(session, '/api/v1/auth/forgot', { email: address }).expect(202)
      const token = await lastMailToken(db, ctx.mail, address, 'recovery')
      await post(session, '/api/v1/auth/reset', { token, password: 'nueva-clave-segura' }).expect(204)
      expectError(await post(session, '/api/v1/auth/reset', { token, password: 'otra-clave-segura' }), 422, 'TOKEN_INVALID')
      await loginAgent(request, ctx.app, address, 'nueva-clave-segura')
    })
  })

  describe('PATCH /profile', () => {
    it('edita solo el nombre; rol y correo no son editables', async () => {
      const address = email('profile')
      await insertAccount(db, { name: 'Ana', address, role: 'owner' })
      const session = await loginAgent(request, ctx.app, address)
      const updated = await session.agent.patch('/api/v1/profile').set('X-CSRF-Token', session.csrf).send({ name: '  Ana María ' }).expect(200)
      expect(updated.body).toEqual({ account: { ...session.account, name: 'Ana María' } })
      for (const extra of [{ role: 'worker' }, { email: email('other') }]) {
        expectError(await session.agent.patch('/api/v1/profile').set('X-CSRF-Token', session.csrf).send({ name: 'X', ...extra }), 422, 'VALIDATION_ERROR')
      }
      expect((await session.agent.get('/api/v1/auth/me')).body.account).toMatchObject({ role: 'owner', email: address, name: 'Ana María' })
    })

    it('sin sesión responde 401', async () => {
      const session = await csrfAgent(request, ctx.app)
      expectError(await session.agent.patch('/api/v1/profile').set('X-CSRF-Token', session.csrf).send({ name: 'X' }), 401, 'UNAUTHENTICATED')
    })
  })

  describe('GET /invitations/preview y POST /invitations/accept', () => {
    it('preview es público y no expone dueño, correo ni campos', async () => {
      const ownerId = await insertAccount(db, { name: 'Dueño Privado', address: email('preview-owner'), role: 'owner' })
      const farmId = await insertFarm(db, { ownerId, name: 'Campo Secreto' })
      const { token } = await insertInvitation(db, { ownerId, address: email('preview-worker'), farmIds: [farmId], issuedAt: ctx.clock.now() })
      const valid = await request(ctx.app).get('/api/v1/invitations/preview').query({ token }).expect(200)
      const invalid = await request(ctx.app).get('/api/v1/invitations/preview').query({ token: 'x'.repeat(43) }).expect(200)
      expect(valid.body).toEqual({ valid: true })
      expect(invalid.body).toEqual({ valid: false, reason: 'invalid' })
      expect(JSON.stringify([valid.body, invalid.body])).not.toMatch(/Campo Secreto|Dueño Privado|test\.invalid/)
      expect(valid.headers['cache-control']).toMatch(/no-store/)
    })

    it('accept exige sesión y cuenta peón; un dueño se rechaza sin cambiar su rol', async () => {
      const ownerAddress = email('accept-owner')
      const ownerId = await insertAccount(db, { name: 'Dueño', address: ownerAddress, role: 'owner' })
      const farmId = await insertFarm(db, { ownerId, name: 'Campo' })
      const { token } = await insertInvitation(db, { ownerId, address: ownerAddress, farmIds: [farmId], issuedAt: ctx.clock.now() })
      expectError(await post(await csrfAgent(request, ctx.app), '/api/v1/invitations/accept', { token }), 401, 'UNAUTHENTICATED')
      const owner = await loginAgent(request, ctx.app, ownerAddress)
      expectError(await post(owner, '/api/v1/invitations/accept', { token }), 403, 'ROLE_INCOMPATIBLE')
      expect((await owner.agent.get('/api/v1/auth/me')).body.account.role).toBe('owner')
    })
  })

  it('limita las rutas de identidad con 429', async () => {
    const limited = buildIdentityApp(db, { limits: { generalPerMinute: 100_000, identityPer15Minutes: 2 } })
    try {
      const session = await csrfAgent(request, limited.app)
      for (let i = 0; i < 2; i += 1) await post(session, '/api/v1/auth/forgot', { email: email('limit') })
      expectError(await post(session, '/api/v1/auth/forgot', { email: email('limit') }), 429, 'RATE_LIMITED')
    } finally { limited.identity.close() }
  })
})
