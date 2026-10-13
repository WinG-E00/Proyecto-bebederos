import { ApiError } from './errors.js'

// US1 conectará la sesión persistente. Nunca leer identidad/rol de body o query.
export function requireAccount(access) {
  return async (req, _res, next) => {
    try { req.account = await access.account(req.session?.accountId); next() } catch (error) { next(error) }
  }
}
export function requireOwner(req, _res, next) {
  if (!req.account) return next(new ApiError(401, 'UNAUTHENTICATED'))
  if (req.account.role !== 'owner') return next(new ApiError(403, 'ROLE_FORBIDDEN'))
  next()
}
export function authorizeFarm(access, { param = 'id', includeRetired = false } = {}) {
  return async (req, _res, next) => {
    try { req.farm = await access.farm(req.account, req.params[param], { includeRetired }); next() } catch (error) { next(error) }
  }
}
export function authorizeResource(access, type, { param = 'id', includeRetired = false } = {}) {
  return async (req, _res, next) => {
    try { req.resource = await access.resource(req.account, type, req.params[param], { includeRetired }); next() } catch (error) { next(error) }
  }
}
