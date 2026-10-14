import { createAccessService } from './access.service.js'
import { select } from './monitoringSql.service.js'
import { troughSelect } from './trough.service.js'
import { animalSelect } from './animal.service.js'
import { validCoordinates } from './proximity.service.js'
export function createMapService(db) {
  const access = createAccessService(db)
  return {
    async list(account, query) {
      let ids = await access.farmIds(account)
      if (query.farmId) {
        await access.farm(account, query.farmId)
        ids = [Number(query.farmId)]
      }
      if (!ids.length) return []
      const troughs = await select(
        db,
        `${troughSelect} WHERE t.farmId IN (:ids) AND t.deletedAt IS NULL`,
        { ids },
      )
      const animals = await select(
        db,
        `${animalSelect} WHERE a.farmId IN (:ids) AND a.deletedAt IS NULL`,
        { ids },
      )
      return [
        ...troughs.map((r) => ({
          type: 'trough',
          id: r.id,
          farmId: r.farmId,
          name: r.name,
          latitude: r.deviceLatitude ?? r.latitude,
          longitude: r.deviceLongitude ?? r.longitude,
        })),
        ...animals
          .filter((r) => r.measuredAt)
          .map((r) => ({
            type: 'animal',
            id: r.id,
            farmId: r.farmId,
            name: r.name,
            latitude: r.latitude,
            longitude: r.longitude,
          })),
      ].filter(validCoordinates)
    },
  }
}
