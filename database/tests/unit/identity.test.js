import { describe, expect, it } from 'vitest'
import session from 'express-session'
import request from 'supertest'
import { Sequelize } from 'sequelize'
import { createApp } from '../../app.js'
import { csrfProtection, ensureCsrfToken, issueCsrfToken } from '../../middleware/csrf.js'
import { sessionMiddleware } from '../../middleware/session.js'
import { identityLimiter, securityHeaders } from '../../middleware/security.js'
import { validate } from '../../middleware/validate.js'
import { defineAccount, serializeAccount } from '../../models/Account.model.js'
import { TOKEN_TTL_MS, generateToken, hashToken } from '../../models/IdentityToken.model.js'
import { loginSchema, profileSchema, registerSchema, resetSchema } from '../../services/auth.schemas.js'
import { createIdentityApi } from '../../router/auth.router.js'

const SECRET = 'unit-session-secret-test-only-32-bytes'

describe('esquemas de identidad', () => {
  const valid = { name: 'Ana', email: 'ana@test.invalid', password: 'clave-segura-10' }
  it('normaliza correo y nombre', () => {
    expect(registerSchema.parse({ ...valid, name: '  Ana  ', email: '  ANA@Test.Invalid ' })).toEqual({ ...valid })
  })
  it.each([[{ role: 'owner' }], [{ role: 'worker' }], [{ perfilId: 1 }], [{ ownerId: 3 }], [{ emailVerifiedAt: '2026-01-01' }]])('el rol no es elegible por el cliente: rechaza %j', (extra) => {
    expect(registerSchema.safeParse({ ...valid, ...extra }).success).toBe(false)
  })
  it('contraseña: al menos 10 caracteres y como máximo 72 bytes UTF-8', () => {
    expect(registerSchema.safeParse({ ...valid, password: '123456789' }).success).toBe(false)
    expect(registerSchema.safeParse({ ...valid, password: 'a'.repeat(72) }).success).toBe(true)
    expect(registerSchema.safeParse({ ...valid, password: 'ñ'.repeat(36) }).success).toBe(true)
    expect(registerSchema.safeParse({ ...valid, password: 'ñ'.repeat(37) }).success).toBe(false)
    expect(resetSchema.safeParse({ token: 'a'.repeat(43), password: 'ñ'.repeat(37) }).success).toBe(false)
  })
  it('perfil solo acepta nombre no vacío', () => {
    expect(profileSchema.safeParse({ name: '   ' }).success).toBe(false)
    expect(profileSchema.safeParse({ name: 'Ana', email: 'otra@test.invalid' }).success).toBe(false)
    expect(profileSchema.safeParse({ name: 'Ana', role: 'worker' }).success).toBe(false)
  })
  it('login no acepta propiedades adicionales', () => {
    expect(loginSchema.safeParse({ email: 'ana@test.invalid', password: 'x', role: 'owner' }).success).toBe(false)
  })
  it('los errores de validación no reflejan la contraseña recibida', async () => {
    const app = createApp({ configure: (server) => server.post('/register', validate(registerSchema), (_req, res) => res.end()) })
    const response = await request(app).post('/register').send({ ...valid, password: 'secreta' })
    expect(response.status).toBe(422)
    expect(Object.keys(response.body.fields)).toEqual(['password'])
    expect(JSON.stringify(response.body)).not.toContain('secreta')
  })
})

describe('cuenta y tokens', () => {
  it('serializa sin hash ni fechas internas', () => {
    const account = { id: 4, name: 'Ana', email: 'ana@test.invalid', role: 'owner', passwordHash: '$2b$12$hash', emailVerifiedAt: new Date() }
    expect(serializeAccount(account)).toEqual({ id: 4, name: 'Ana', email: 'ana@test.invalid', role: 'owner' })
  })
  it('normaliza el correo en el modelo y no permite cambiar rol ni correo', async () => {
    const db = new Sequelize('bebederos_unit', 'unit', 'unit', { dialect: 'mysql', logging: false })
    try {
      const Account = defineAccount(db)
      const account = Account.build({ name: ' Ana ', email: ' ANA@Test.Invalid ', passwordHash: 'x', role: 'owner' })
      await account.validate()
      expect([account.name, account.email]).toEqual(['Ana', 'ana@test.invalid'])
      const stored = Account.build({ id: 1, name: 'Ana', email: 'ana@test.invalid', passwordHash: 'x', role: 'owner' }, { isNewRecord: false, raw: true })
      stored.set('role', 'worker')
      await expect(Account.runHooks('beforeUpdate', stored)).rejects.toThrow(/no son editables/)
    } finally { await db.close() }
  })
  it('genera tokens aleatorios de un uso y guarda solo su hash', () => {
    const first = generateToken(); const second = generateToken()
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first.token).not.toBe(second.token)
    expect(first.hash).toBe(hashToken(first.token))
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/)
    expect(TOKEN_TTL_MS).toEqual({ verification: 24 * 60 * 60 * 1000, recovery: 30 * 60 * 1000 })
  })
})

function sessionApp({ production = false, limits } = {}) {
  return createApp({
    trustProxy: production ? 1 : 0,
    configure: (app) => {
      if (limits) app.use('/api', securityHeaders(limits))
      app.use('/api/v1', sessionMiddleware({ store: new session.MemoryStore(), secret: SECRET, production }), csrfProtection)
      app.get('/api/v1/auth/csrf', issueCsrfToken)
      app.post('/api/v1/rotate', (req, res) => res.json({ csrfToken: ensureCsrfToken(req, { rotate: true }) }))
      app.post('/api/v1/write', (_req, res) => res.json({ ok: true }))
      if (limits) app.post('/api/v1/limited', identityLimiter(limits), (_req, res) => res.json({ ok: true }))
    },
  })
}

describe('cookies de sesión, CSRF y límites', () => {
  it('cookie HttpOnly, SameSite=Lax, 24 horas y sin Secure fuera de producción', async () => {
    const response = await request(sessionApp()).get('/api/v1/auth/csrf').expect(200)
    const cookie = response.headers['set-cookie'].join(';')
    expect(cookie).toMatch(/^bebederos\.sid=/)
    expect(cookie).toMatch(/HttpOnly/)
    expect(cookie).toMatch(/SameSite=Lax/)
    expect(cookie).toMatch(/Max-Age=86400|Expires=/)
    expect(cookie).not.toMatch(/Secure/)
    expect(response.headers['cache-control']).toBe('no-store')
  })
  it('cookie Secure en producción detrás del proxy HTTPS configurado', async () => {
    const response = await request(sessionApp({ production: true })).get('/api/v1/auth/csrf').set('X-Forwarded-Proto', 'https').expect(200)
    expect(response.headers['set-cookie'].join(';')).toMatch(/Secure/)
  })
  it('rechaza escrituras sin token, con token ajeno o rotado y acepta el vigente', async () => {
    const app = sessionApp()
    const agent = request.agent(app)
    const { csrfToken } = (await agent.get('/api/v1/auth/csrf')).body
    const other = (await request(app).get('/api/v1/auth/csrf')).body.csrfToken
    expect((await agent.post('/api/v1/write')).body.code).toBe('CSRF_INVALID')
    expect((await agent.post('/api/v1/write').set('X-CSRF-Token', other)).status).toBe(403)
    await agent.post('/api/v1/write').set('X-CSRF-Token', csrfToken).expect(200)
    const rotated = (await agent.post('/api/v1/rotate').set('X-CSRF-Token', csrfToken).expect(200)).body.csrfToken
    expect((await agent.post('/api/v1/write').set('X-CSRF-Token', csrfToken)).status).toBe(403)
    await agent.post('/api/v1/write').set('X-CSRF-Token', rotated).expect(200)
  })
  it('lecturas no exigen CSRF', async () => {
    const app = createApp({ configure: (server) => server.use(sessionMiddleware({ store: new session.MemoryStore(), secret: SECRET }), csrfProtection, (_req, res) => res.json({ ok: true })) })
    await request(app).get('/cualquiera').expect(200)
  })
  it('responde 429 con el contrato al superar el límite de identidad y agrega cabeceras Helmet', async () => {
    const agent = request.agent(sessionApp({ limits: { generalPerMinute: 100, identityPer15Minutes: 1 } }))
    const first = await agent.get('/api/v1/auth/csrf')
    expect(first.headers['x-content-type-options']).toBe('nosniff')
    const { csrfToken } = first.body
    await agent.post('/api/v1/limited').set('X-CSRF-Token', csrfToken).expect(200)
    const limited = await agent.post('/api/v1/limited').set('X-CSRF-Token', csrfToken)
    expect(limited.status).toBe(429)
    expect(limited.body).toEqual({ code: 'RATE_LIMITED', message: expect.any(String) })
  })
  it('exige secreto de sesión de 32 bytes y la cola de correo', () => {
    expect(() => sessionMiddleware({ store: new session.MemoryStore(), secret: 'corto' })).toThrow(/SESSION_SECRET/)
    expect(() => createIdentityApi({ db: {}, env: { SESSION_SECRET: SECRET } })).toThrow(/cola de correo/)
  })
})

it('las rutas legacy de usuario y perfil siguen retiradas', async () => {
  const app = createApp()
  for (const path of ['/api/user/create', '/api/user/login', '/api/perfil/create']) {
    expect((await request(app).post(path).send({ perfilId: 2 })).status).toBe(404)
  }
})
