import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAccount } from '../middleware/authorization.js'
import { csrfProtection, ensureCsrfToken, issueCsrfToken } from '../middleware/csrf.js'
import { SESSION_COOKIE, rejectExpiredSession, sessionCookieOptions, sessionMiddleware } from '../middleware/session.js'
import { DEFAULT_LIMITS, identityLimiter, securityHeaders } from '../middleware/security.js'
import { serializeAccount } from '../models/Account.model.js'
import { createAccessService } from '../services/access.service.js'
import { createAuthService } from '../services/auth.service.js'
import { createInvitationAcceptanceService } from '../services/invitationAcceptance.service.js'
import { createSessionService, createSessionStore, destroySession, regenerateSession, saveSession } from '../services/session.service.js'
import { emailSchemaBody, loginSchema, registerSchema, resetSchema, tokenSchemaBody } from '../services/auth.schemas.js'
import { createProfileRouter } from './profile.router.js'
import { createInvitationAcceptanceRouter } from './invitationAcceptance.router.js'

const body = (req) => req.validated.body

export function createAuthRouter({ auth, access, limiter, production }) {
  const router = Router()
  router.get('/csrf', issueCsrfToken)

  router.post('/register', limiter, validate(registerSchema), async (req, res) => {
    const { status, body: result } = await auth.register(body(req))
    res.status(status).json(result)
  })

  // Sesión regenerada y token CSRF nuevo: el anterior al login deja de servir.
  router.post('/login', limiter, validate(loginSchema), async (req, res) => {
    const account = await auth.login(body(req))
    await regenerateSession(req)
    req.session.accountId = Number(account.id)
    const csrfToken = ensureCsrfToken(req, { rotate: true })
    await saveSession(req)
    res.json({ account: serializeAccount(account), csrfToken })
  })

  router.get('/me', requireAccount(access), (req, res) => {
    res.set('Cache-Control', 'no-store')
    res.json({ account: serializeAccount(req.account) })
  })

  // Invalida la sesión en MySQL y la cookie; el cuerpo se ignora.
  router.post('/logout', async (req, res) => {
    await destroySession(req)
    res.clearCookie(SESSION_COOKIE, sessionCookieOptions(production))
    res.status(204).end()
  })

  router.post('/verify', limiter, validate(tokenSchemaBody), async (req, res) => {
    await auth.verifyEmail(body(req))
    res.status(204).end()
  })
  router.post('/resend-verification', limiter, validate(emailSchemaBody), async (req, res) => {
    res.status(202).json(await auth.resendVerification(body(req)))
  })
  router.post('/forgot', limiter, validate(emailSchemaBody), async (req, res) => {
    res.status(202).json(await auth.forgotPassword(body(req)))
  })
  router.post('/reset', limiter, validate(resetSchema), async (req, res) => {
    await auth.resetPassword(body(req))
    res.status(204).end()
  })
  return router
}

// Compone sesión SQL, CSRF, límites y rutas de identidad bajo /api/v1.
// `mail` es la cola durable cifrada de la fase 2 (services/mail.service.js).
export function createIdentityApi({ db, mail, env, clock = { now: () => new Date() }, limits = DEFAULT_LIMITS, bcryptRounds }) {
  if (!mail) throw new Error('La API de identidad requiere la cola de correo')
  const production = env.NODE_ENV === 'production'
  const store = createSessionStore(db)
  const access = createAccessService(db)
  const invitations = createInvitationAcceptanceService(db, { clock })
  const auth = createAuthService(db, { mail, sessions: createSessionService(db), invitations, appUrl: env.APP_URL, clock, bcryptRounds })
  const limiter = identityLimiter(limits)

  function install(app) {
    app.use('/api', securityHeaders(limits))
    app.use('/api/v1', sessionMiddleware({ store, secret: env.SESSION_SECRET, production }), rejectExpiredSession, csrfProtection)
    app.use('/api/v1/auth', createAuthRouter({ auth, access, limiter, production }))
    app.use('/api/v1/profile', createProfileRouter({ auth, access }))
    app.use('/api/v1/invitations', createInvitationAcceptanceRouter({ invitations, access, limiter }))
  }
  return { install, close: () => store.stopExpiringSessions() }
}
