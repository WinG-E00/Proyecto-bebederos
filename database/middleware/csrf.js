import { randomBytes, timingSafeEqual } from 'node:crypto'
import { ApiError } from './errors.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// Token sincronizado con la sesión; el cliente lo envía en X-CSRF-Token y nunca lo persiste.
export function ensureCsrfToken(req, { rotate = false } = {}) {
  if (rotate || typeof req.session.csrfToken !== 'string') req.session.csrfToken = randomBytes(32).toString('base64url')
  return req.session.csrfToken
}

export function issueCsrfToken(req, res) {
  res.set('Cache-Control', 'no-store')
  res.json({ csrfToken: ensureCsrfToken(req) })
}

function matches(expected, received) {
  if (typeof expected !== 'string' || typeof received !== 'string') return false
  const a = Buffer.from(expected); const b = Buffer.from(received)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Toda escritura exige el token de su propia sesión, incluidos login y registro.
export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next()
  if (!matches(req.session?.csrfToken, req.get('X-CSRF-Token'))) return next(new ApiError(403, 'CSRF_INVALID'))
  next()
}
