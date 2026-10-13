import { ApiError } from '../middleware/errors.js'
function positiveInteger(value, fallback) {
  if (value === undefined) return fallback
  if (!(typeof value === 'number' || typeof value === 'string') || !/^[1-9]\d*$/.test(String(value))) throw new ApiError(422, 'INVALID_PAGINATION')
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) throw new ApiError(422, 'INVALID_PAGINATION')
  return parsed
}
export function pagination(query = {}) {
  const page = positiveInteger(query.page, 1); const limit = positiveInteger(query.limit, 50)
  const offset = (page - 1) * limit
  if (limit > 100 || !Number.isSafeInteger(offset)) throw new ApiError(422, 'INVALID_PAGINATION')
  return { page, limit, offset }
}
export function paginated(items, total, { page, limit }) { return { items, total, page, limit } }
