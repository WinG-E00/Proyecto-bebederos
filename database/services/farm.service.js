import { createAccessService } from './access.service.js'
import { select, insert } from './monitoringSql.service.js'
import { pagination, paginated } from './pagination.js'
import { applyFarmSettings } from './farmSettings.service.js'
import { retireFarm } from './farmRetirement.service.js'
const representation = `SELECT f.id,f.name,f.deletedAt,f.latitude,f.longitude,f.areaHa,f.description,f.staleMinutes,f.timezone,
 (SELECT COUNT(*) FROM Animals a WHERE a.farmId=f.id AND a.deletedAt IS NULL) animalCount,
 (SELECT COUNT(*) FROM Troughs t WHERE t.farmId=f.id AND t.deletedAt IS NULL) troughCount FROM Farms f`
export function createFarmService(db, { clock = { now: () => new Date() } } = {}) {
  const access = createAccessService(db)
  async function detail(account, id, transaction) {
    await access.farm(account, id, { transaction })
    return (await select(db, `${representation} WHERE f.id=:id`, { id }, transaction))[0]
  }
  async function list(account, query) {
    const ids = await access.farmIds(account, {includeRetired: query.includeRetired === 'true'})
    const p = pagination(query)
    if (!ids.length) return paginated([], 0, p)
    const rows = await select(
      db,
      `${representation} WHERE f.id IN (:ids) ORDER BY f.id LIMIT :limit OFFSET :offset`,
      { ids, ...p },
    )
    return paginated(rows, ids.length, p)
  }
  async function create(account, body) {
    return db.transaction(async (transaction) => {
      const now = clock.now()
      const id = await insert(
        db,
        'Farms',
        { ...body, ownerId: account.id, createdAt: now, updatedAt: now },
        transaction,
      )
      return detail(account, id, transaction)
    })
  }
  async function patch(account, id, body) {
    return db.transaction(async (transaction) => {
      const farm = await access.farm(account, id, { transaction, lock: true })
      await applyFarmSettings(db, farm, body, { transaction, now: clock.now() })
      return detail(account, id, transaction)
    })
  }
  async function remove(account, id) {
    return db.transaction(async (transaction) => {
      const farm = await access.farm(account, id, { transaction, lock: true })
      await retireFarm(db, farm, account, { transaction, now: clock.now() })
    })
  }
  return { list, detail, create, patch, remove }
}
