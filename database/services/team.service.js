import { ApiError } from '../middleware/errors.js'
import { select, sqlValues } from './monitoringSql.service.js'
import { pagination, paginated } from './pagination.js'
import { revokeAssignment } from './assignmentRevocation.service.js'
export function createTeamService(
  db,
  { clock = { now: () => new Date() } } = {},
) {
  async function list(a, query = {}) {
    const p = pagination(query)
    const from =
      "FROM Accounts w WHERE w.role='worker' AND EXISTS (SELECT 1 FROM Assignments ass JOIN Farms f ON f.id=ass.farmId WHERE ass.workerId=w.id AND f.ownerId=:ownerId)"
    const [count] = await select(db, `SELECT COUNT(*) total ${from}`, {
      ownerId: a.id,
    })
    const rows = await select(
      db,
      `SELECT w.id,w.name,w.email ${from} ORDER BY w.id LIMIT :limit OFFSET :offset`,
      { ownerId: a.id, ...p },
    )
    const items = []
    for (const row of rows) {
      const farms = await select(
        db,
        'SELECT ass.farmId FROM Assignments ass JOIN Farms f ON f.id=ass.farmId WHERE ass.workerId=:id AND f.ownerId=:ownerId AND ass.active=TRUE AND f.deletedAt IS NULL ORDER BY ass.farmId',
        { id: row.id, ownerId: a.id },
      )
      items.push({ ...row, farmIds: farms.map((f) => f.farmId) })
    }
    return paginated(items, Number(count.total), p)
  }
  async function replace(a, workerId, { farmIds }) {
    if (
      !/^[1-9]\d*$/.test(String(workerId)) ||
      !Number.isSafeInteger(Number(workerId))
    )
      throw new ApiError(404, 'NOT_FOUND')
    return db.transaction(async (transaction) => {
      // Serialize replacements, accepts, actions and retirement on the same farm rows.
      const farms = await select(
        db,
        'SELECT id,deletedAt FROM Farms WHERE ownerId=:ownerId ORDER BY id FOR UPDATE',
        { ownerId: a.id },
        transaction,
      )
      if (farmIds.some((id) => !farms.some((f) => f.id === id && !f.deletedAt)))
        throw new ApiError(404, 'NOT_FOUND')
      const [known] = await select(
        db,
        "SELECT w.id FROM Accounts w WHERE w.id=:workerId AND w.role='worker' AND EXISTS (SELECT 1 FROM Assignments a JOIN Farms f ON f.id=a.farmId WHERE a.workerId=w.id AND f.ownerId=:ownerId)",
        { workerId, ownerId: a.id },
        transaction,
      )
      if (!known) throw new ApiError(404, 'NOT_FOUND')
      const now = clock.now()
      for (const f of farms) {
        if (farmIds.includes(f.id))
          await db.query(
            'INSERT INTO Assignments (farmId,workerId,active,revokedAt,createdAt,updatedAt) VALUES (:farmId,:workerId,TRUE,NULL,:now,:now) ON DUPLICATE KEY UPDATE active=TRUE,revokedAt=NULL,updatedAt=VALUES(updatedAt)',
            {
              replacements: sqlValues({ farmId: f.id, workerId, now }),
              transaction,
            },
          )
        else
          await revokeAssignment(db, {
            farmId: f.id,
            workerId: Number(workerId),
            actorId: a.id,
            now,
            transaction,
          })
      }
      return { id: Number(workerId), farmIds }
    })
  }
  return { list, replace }
}
