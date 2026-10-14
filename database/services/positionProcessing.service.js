import { select, insert, update } from './monitoringSql.service.js'
import { writeHistory } from './historyWriter.service.js'
import { isNewerSample } from './water.service.js'
import { nearestTrough, entryVisit, validCoordinates } from './proximity.service.js'
export function createPositionProcessing(
  db,
  { clock = { now: () => new Date() }, batchSize = 500, radius = 5 } = {},
) {
  if (!Number.isFinite(radius) || radius <= 0) throw new Error('Radio inválido')
  return {
    async process() {
      let processed = 0
      const farms = await select(
        db,
        'SELECT DISTINCT a.farmId FROM AnimalPositions p JOIN Animals a ON a.id=p.animalId WHERE p.processedAt IS NULL ORDER BY a.farmId',
      )
      for (const { farmId } of farms)
        await db.transaction(async (transaction) => {
          const [farm] = await select(
            db,
            'SELECT * FROM Farms WHERE id=:farmId FOR UPDATE',
            { farmId },
            transaction,
          )
          const troughs = await select(
            db,
            `SELECT t.id,COALESCE(p.latitude,t.latitude) latitude,COALESCE(p.longitude,t.longitude) longitude FROM Troughs t LEFT JOIN TroughStates s ON s.troughId=t.id LEFT JOIN TroughPositions p ON p.id=s.lastPositionId WHERE t.farmId=:farmId AND t.deletedAt IS NULL ORDER BY t.id`,
            { farmId },
            transaction,
          )
          const animals = await select(
            db,
            'SELECT DISTINCT a.id FROM Animals a JOIN AnimalPositions p ON p.animalId=a.id WHERE a.farmId=:farmId AND p.processedAt IS NULL ORDER BY a.id',
            { farmId },
            transaction,
          )
          for (const { id } of animals) {
            const [animal] = await select(
              db,
              'SELECT * FROM Animals WHERE id=:id FOR UPDATE',
              { id },
              transaction,
            )
            await db.query('INSERT IGNORE INTO AnimalStates (animalId) VALUES (:id)', {
              replacements: { id },
              transaction,
            })
            const [state] = await select(
              db,
              'SELECT * FROM AnimalStates WHERE animalId=:id FOR UPDATE',
              { id },
              transaction,
            )
            let current = state.lastPositionId
              ? (
                  await select(
                    db,
                    'SELECT * FROM AnimalPositions WHERE id=:id',
                    { id: state.lastPositionId },
                    transaction,
                  )
                )[0]
              : null
            let inRange = state.troughInRangeId
            const samples = await select(
              db,
              'SELECT * FROM AnimalPositions WHERE animalId=:id AND processedAt IS NULL ORDER BY measuredAt,id LIMIT :batchSize FOR UPDATE',
              { id, batchSize },
              transaction,
            )
            for (const sample of samples) {
              const now = clock.now()
              let result = 'current'
              const valid = validCoordinates(sample)
              if (!valid) result = 'invalid'
              else if (new Date(sample.measuredAt) > now) result = 'future'
              else if (farm.deletedAt || animal.deletedAt) result = 'retired'
              else if (!isNewerSample(sample, current)) result = 'historical'
              if (valid && result !== 'future')
                await writeHistory(
                  db,
                  {
                    farmId,
                    type: 'gps',
                    resourceId: id,
                    occurredAt: new Date(sample.measuredAt),
                    details: {
                      resourceType: 'animal',
                      positionId: sample.id,
                      latitude: sample.latitude,
                      longitude: sample.longitude,
                      result,
                    },
                  },
                  { transaction },
                )
              if (result === 'current') {
                const nearest = nearestTrough(sample, troughs, radius)
                const next = nearest?.id ?? null
                if (entryVisit(inRange, next)) {
                  const visitId = await insert(
                    db,
                    'EstimatedVisits',
                    {
                      farmId,
                      animalId: id,
                      troughId: next,
                      positionId: sample.id,
                      visitedAt: new Date(sample.measuredAt),
                    },
                    transaction,
                  )
                  await writeHistory(
                    db,
                    {
                      farmId,
                      type: 'visit',
                      resourceId: id,
                      occurredAt: new Date(sample.measuredAt),
                      details: { visitId, troughId: next, positionId: sample.id, estimated: true },
                    },
                    { transaction },
                  )
                }
                await update(
                  db,
                  'AnimalStates',
                  id,
                  { lastPositionId: sample.id, troughInRangeId: next },
                  transaction,
                  'animalId',
                )
                current = sample
                inRange = next
              }
              await update(
                db,
                'AnimalPositions',
                sample.id,
                { processedAt: now, processingResult: result },
                transaction,
              )
              processed++
            }
          }
        })
      return { processed }
    },
  }
}
