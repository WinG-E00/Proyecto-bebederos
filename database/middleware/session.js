import session from 'express-session'
import { SESSION_TTL_MS, destroySession } from '../services/session.service.js'

export const SESSION_COOKIE = 'bebederos.sid'

export function sessionCookieOptions(production) {
  return { httpOnly: true, sameSite: 'lax', secure: Boolean(production), path: '/' }
}

// Cookie HttpOnly, SameSite=Lax, Secure en producción y 24 h. Sin renovación por actividad:
// al cumplirse las 24 h hay que volver a iniciar sesión.
export function sessionMiddleware({ store, secret, production }) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) throw new Error('SESSION_SECRET requiere al menos 32 bytes')
  return session({
    name: SESSION_COOKIE, secret, store,
    resave: false, saveUninitialized: false, rolling: false, unset: 'destroy',
    cookie: { ...sessionCookieOptions(production), maxAge: SESSION_TTL_MS },
  })
}

// El almacén limpia vencidas periódicamente; aquí se rechaza una vencida aunque siga en MySQL.
export async function rejectExpiredSession(req, _res, next) {
  try {
    const expires = req.session?.cookie?.expires
    if (req.session?.accountId && expires && new Date(expires).getTime() <= Date.now()) await destroySession(req)
    next()
  } catch (error) { next(error) }
}
