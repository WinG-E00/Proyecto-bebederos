import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { ApiError } from './errors.js'

// Límites iniciales del plan, revisables durante las pruebas de carga.
export const DEFAULT_LIMITS = Object.freeze({ generalPerMinute: 600, identityPer15Minutes: 30 })

function limiter(windowMs, limit) {
  return rateLimit({
    windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, _res, next) => next(new ApiError(429, 'RATE_LIMITED')),
  })
}

// Helmet y límite general de 600 solicitudes por minuto por IP.
export function securityHeaders(limits = DEFAULT_LIMITS) {
  return [helmet(), limiter(60 * 1000, limits.generalPerMinute)]
}

// Identidad y envíos de correo: 30 solicitudes cada 15 minutos por IP.
export function identityLimiter(limits = DEFAULT_LIMITS) {
  return limiter(15 * 60 * 1000, limits.identityPer15Minutes)
}
