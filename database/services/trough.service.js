import { createAccessService } from './access.service.js'
import { select, insert, update } from './monitoringSql.service.js'
import { pagination, paginated } from './pagination.js'
import { serializeTrough } from './water.service.js'
import { ApiError } from '../middleware/errors.js'
import { writeHistory } from './historyWriter.service.js'
import { resolveRetiredAlerts } from './farmRetirement.service.js'
export const troughSelect = `SELECT t.*,f.staleMinutes,w.percentage,w.measuredAt,p.latitude deviceLatitude,p.longitude deviceLongitude,p.measuredAt positionMeasuredAt FROM Troughs t JOIN Farms f ON f.id=t.farmId LEFT JOIN TroughStates s ON s.troughId=t.id LEFT JOIN WaterReadings w ON w.id=s.lastReadingId LEFT JOIN TroughPositions p ON p.id=s.lastPositionId`
export function createTroughService(db, { clock = { now: () => new Date() } } = {}) {
  const access = createAccessService(db)
  async function detail(a, id, transaction) {
    await access.resource(a, 'trough', id, { transaction })
    return serializeTrough(
      (await select(db, `${troughSelect} WHERE t.id=:id`, { id }, transaction))[0],
      clock.now(),
    )
  }
  async function list(a, query) {
    let ids = await access.farmIds(a)
    const p = pagination(query)
    if (query.farmId) {
      await access.farm(a, query.farmId)
      ids = [Number(query.farmId)]
    }
    if (!ids.length) return paginated([], 0, p)
    const [count] = await select(
      db,
      'SELECT COUNT(*) total FROM Troughs WHERE farmId IN (:ids) AND deletedAt IS NULL',
      { ids },
    )
    const rows = await select(
      db,
      `${troughSelect} WHERE t.farmId IN (:ids) AND t.deletedAt IS NULL ORDER BY t.id LIMIT :limit OFFSET :offset`,
      { ids, ...p },
    )
    return paginated(
      rows.map((r) => serializeTrough(r, clock.now())),
      Number(count.total),
      p,
    )
  }
  async function create(a, farmId, body) {
    return db.transaction(async (transaction) => {
      await access.farm(a, farmId, { transaction, lock: true })
      const now = clock.now()
      const id = await insert(
        db,
        'Troughs',
        {
          ...body,
          latitude: body.latitude ?? null,
          longitude: body.longitude ?? null,
          farmId: Number(farmId),
          createdAt: now,
          updatedAt: now,
        },
        transaction,
      )
      await insert(db, 'TroughStates', { troughId: id }, transaction)
      return detail(a, id, transaction)
    })
  }
  async function remove(a, id) {
    const initial = await access.resource(a, 'trough', id)
    return db.transaction(async (transaction) => {
      await access.farm(a, initial.farmId, { transaction, lock: true })
      const t = await access.resource(a, 'trough', id, { transaction, lock: true })
      const [count] = await select(
        db,
        "SELECT COUNT(*) total FROM Tasks WHERE troughId=:id AND state<>'Completada'",
        { id },
        transaction,
      )
      if (count.total > 0)
        throw new ApiError(
          409,
          'TROUGH_HAS_OPEN_TASKS',
          undefined,
          `El bebedero tiene ${Number(count.total)} tareas abiertas. Completalas antes de eliminarlo.`,
        )
      const now = clock.now()
      await update(db, 'Troughs', id, { deletedAt: now, updatedAt: now }, transaction)
      await resolveRetiredAlerts(db, t.farmId, { type: 'trough', id: t.id, transaction, now })
      await writeHistory(
        db,
        {
          farmId: t.farmId,
          type: 'retirement',
          resourceId: t.id,
          actorId: a.id,
          occurredAt: now,
          details: { resourceType: 'trough' },
        },
        { transaction },
      )
    })
  }
  return { detail, list, create, remove }
}
