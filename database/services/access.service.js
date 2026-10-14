import { QueryTypes } from 'sequelize'
import { ApiError } from '../middleware/errors.js'

const positiveId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0 && /^\d+$/.test(String(value))
export function createAccessService(db) {
  async function account(accountId, transaction) {
    if (!positiveId(accountId)) throw new ApiError(401, 'UNAUTHENTICATED')
    const rows = await db.query('SELECT id, name, email, role, emailVerifiedAt FROM Accounts WHERE id = :accountId', {
      replacements: { accountId }, type: QueryTypes.SELECT, transaction,
    })
    if (!rows[0]) throw new ApiError(401, 'UNAUTHENTICATED')
    return rows[0]
  }
  const scope = `((a.role = 'owner' AND f.ownerId = a.id) OR
    (a.role = 'worker' AND f.deletedAt IS NULL AND EXISTS
      (SELECT 1 FROM Assignments assignment WHERE assignment.farmId = f.id AND assignment.workerId = a.id AND assignment.active = TRUE)))`
  async function farm(identity, farmId, { transaction, includeRetired = false, lock = false } = {}) {
    if (!positiveId(identity?.id)) throw new ApiError(401, 'UNAUTHENTICATED')
    if (!positiveId(farmId)) throw new ApiError(404, 'NOT_FOUND')
    const rows = await db.query(`SELECT f.* FROM Farms f JOIN Accounts a ON a.id = :accountId
      WHERE f.id = :farmId AND ${scope} AND (f.deletedAt IS NULL OR (:includeRetired AND a.role = 'owner')) ${lock ? 'FOR UPDATE' : ''}`, {
      replacements: { accountId: identity.id, farmId, includeRetired }, transaction, type: QueryTypes.SELECT,
    })
    if (!rows[0]) throw new ApiError(404, 'NOT_FOUND')
    return rows[0]
  }
  async function resource(identity, type, resourceId, options = {}) {
    const table = { trough: 'Troughs', animal: 'Animals', task: 'Tasks' }[type]
    if (!table) throw new Error('Tipo de recurso no permitido')
    if (!positiveId(identity?.id)) throw new ApiError(401, 'UNAUTHENTICATED')
    if (!positiveId(resourceId)) throw new ApiError(404, 'NOT_FOUND')
    const retired = type === 'task' ? '' : "AND (r.deletedAt IS NULL OR (:includeRetired AND a.role = 'owner'))"
    const taskScope = type === 'task' ? "AND (a.role = 'owner' OR r.workerId = a.id)" : ''
    const rows = await db.query(`SELECT r.* FROM ${table} r JOIN Farms f ON f.id = r.farmId JOIN Accounts a ON a.id = :accountId
      WHERE r.id = :resourceId AND ${scope} AND (f.deletedAt IS NULL OR (:includeRetired AND a.role = 'owner'))
      ${retired} ${taskScope} ${options.lock ? 'FOR UPDATE' : ''}`, {
      replacements: { accountId: identity.id, resourceId, includeRetired: options.includeRetired ?? false },
      transaction: options.transaction, type: QueryTypes.SELECT,
    })
    if (!rows[0]) throw new ApiError(404, 'NOT_FOUND')
    return rows[0]
  }
  async function farmIds(identity, { transaction, includeRetired = false } = {}) {
    if (!positiveId(identity?.id)) throw new ApiError(401, 'UNAUTHENTICATED')
    const rows = await db.query(`SELECT f.id FROM Farms f JOIN Accounts a ON a.id = :accountId WHERE (f.deletedAt IS NULL OR (:includeRetired AND a.role='owner')) AND ${scope} ORDER BY f.id`, {
      replacements: { accountId: identity.id, includeRetired }, transaction, type: QueryTypes.SELECT,
    })
    return rows.map((row) => row.id)
  }
  return { account, farm, resource, farmIds }
}
