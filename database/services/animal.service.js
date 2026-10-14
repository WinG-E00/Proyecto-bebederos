import { createAccessService } from './access.service.js'
import { select, insert, update } from './monitoringSql.service.js'
import { pagination, paginated } from './pagination.js'
import { freshness, iso } from './water.service.js'
import { writeHistory } from './historyWriter.service.js'
import { resolveRetiredAlerts } from './farmRetirement.service.js'
export const animalSelect = `SELECT a.*,f.staleMinutes,p.latitude,p.longitude,p.measuredAt,v.troughId,v.visitedAt,t.name troughName FROM Animals a JOIN Farms f ON f.id=a.farmId LEFT JOIN AnimalStates s ON s.animalId=a.id LEFT JOIN AnimalPositions p ON p.id=s.lastPositionId LEFT JOIN EstimatedVisits v ON v.id=(SELECT v2.id FROM EstimatedVisits v2 WHERE v2.animalId=a.id ORDER BY v2.visitedAt DESC,v2.id DESC LIMIT 1) LEFT JOIN Troughs t ON t.id=v.troughId`
export function serializeAnimal(row, now) {
  const { id, farmId, name, species, breed, ageYears, state } = row
  return {
    id,
    farmId,
    name,
    species,
    breed,
    ageYears,
    state,
    position: row.measuredAt
      ? { latitude: row.latitude, longitude: row.longitude, measuredAt: iso(row.measuredAt) }
      : null,
    lastVisit: row.visitedAt
      ? {
          troughId: row.troughId,
          troughName: row.troughName,
          visitedAt: iso(row.visitedAt),
          estimated: true,
        }
      : null,
    freshness: freshness(row.measuredAt, row.staleMinutes, now),
  }
}
export function createAnimalService(db, { clock = { now: () => new Date() } } = {}) {
  const access = createAccessService(db)
  async function detail(a, id, transaction) {
    await access.resource(a, 'animal', id, { transaction })
    return serializeAnimal(
      (await select(db, `${animalSelect} WHERE a.id=:id`, { id }, transaction))[0],
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
      'SELECT COUNT(*) total FROM Animals WHERE farmId IN (:ids) AND deletedAt IS NULL',
      { ids },
    )
    return paginated(
      (
        await select(
          db,
          `${animalSelect} WHERE a.farmId IN (:ids) AND a.deletedAt IS NULL ORDER BY a.id LIMIT :limit OFFSET :offset`,
          { ids, ...p },
        )
      ).map((r) => serializeAnimal(r, clock.now())),
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
        'Animals',
        { ...body, farmId: Number(farmId), createdAt: now, updatedAt: now },
        transaction,
      )
      await insert(db, 'AnimalStates', { animalId: id }, transaction)
      return detail(a, id, transaction)
    })
  }
  async function change(a, id, body, retire = false) {
    const initial = await access.resource(a, 'animal', id)
    return db.transaction(async (transaction) => {
      await access.farm(a, initial.farmId, { transaction, lock: true })
      const resource = await access.resource(a, 'animal', id, { transaction, lock: true })
      const now = clock.now()
      await update(
        db,
        'Animals',
        id,
        { ...(retire ? { deletedAt: now } : body), updatedAt: now },
        transaction,
      )
      if (retire) {
        await resolveRetiredAlerts(db, resource.farmId, {
          type: 'animal',
          id: resource.id,
          transaction,
          now,
        })
        await writeHistory(
          db,
          {
            farmId: resource.farmId,
            type: 'retirement',
            resourceId: resource.id,
            actorId: a.id,
            occurredAt: now,
            details: { resourceType: 'animal' },
          },
          { transaction },
        )
      } else return detail(a, id, transaction)
    })
  }
  return {
    detail,
    list,
    create,
    patch: (a, id, body) => change(a, id, body),
    remove: (a, id) => change(a, id, {}, true),
  }
}
