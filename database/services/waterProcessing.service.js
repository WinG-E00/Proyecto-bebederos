import { select, insert, update } from './monitoringSql.service.js'
import { writeHistory } from './historyWriter.service.js'
import { isNewerSample, waterCategory } from './water.service.js'
export function createWaterProcessing(
  db,
  { clock = { now: () => new Date() }, batchSize = 500 } = {},
) {
  async function processTable(table) {
    const pending = await select(
      db,
      `SELECT DISTINCT r.farmId FROM ${table} p JOIN Troughs r ON r.id=p.troughId WHERE p.processedAt IS NULL ORDER BY r.farmId`,
    )
    let processed = 0
    for (const { farmId } of pending)
      await db.transaction(async (transaction) => {
        const [farm] = await select(
          db,
          'SELECT * FROM Farms WHERE id=:farmId FOR UPDATE',
          { farmId },
          transaction,
        )
        const resources = await select(
          db,
          `SELECT DISTINCT t.id FROM Troughs t JOIN ${table} p ON p.troughId=t.id WHERE t.farmId=:farmId AND p.processedAt IS NULL ORDER BY t.id`,
          { farmId },
          transaction,
        )
        for (const { id } of resources) {
          const [trough] = await select(
            db,
            'SELECT * FROM Troughs WHERE id=:id FOR UPDATE',
            { id },
            transaction,
          )
          await db.query('INSERT IGNORE INTO TroughStates (troughId) VALUES (:id)', {
            replacements: { id },
            transaction,
          })
          const [state] = await select(
            db,
            'SELECT * FROM TroughStates WHERE troughId=:id FOR UPDATE',
            { id },
            transaction,
          )
          const water = table === 'WaterReadings'
          const stateKey = water ? 'lastReadingId' : 'lastPositionId'
          let current = state[stateKey]
            ? (
                await select(
                  db,
                  `SELECT * FROM ${table} WHERE id=:id`,
                  { id: state[stateKey] },
                  transaction,
                )
              )[0]
            : null
          const samples = await select(
            db,
            `SELECT * FROM ${table} WHERE troughId=:id AND processedAt IS NULL ORDER BY measuredAt,id LIMIT :batchSize FOR UPDATE`,
            { id, batchSize },
            transaction,
          )
          for (const sample of samples) {
            const now = clock.now()
            let result = 'current'
            const valid = water
              ? waterCategory(sample.percentage) !== null
              : Number.isFinite(sample.latitude) &&
                Number.isFinite(sample.longitude) &&
                Math.abs(sample.latitude) <= 90 &&
                Math.abs(sample.longitude) <= 180
            if (!valid) result = 'invalid'
            else if (new Date(sample.measuredAt) > now) result = 'future'
            else if (farm.deletedAt || trough.deletedAt) result = 'retired'
            else if (!isNewerSample(sample, current)) result = 'historical'
            if (valid && result !== 'future')
              await writeHistory(
                db,
                {
                  farmId,
                  type: water ? 'water' : 'gps',
                  resourceId: id,
                  occurredAt: new Date(sample.measuredAt),
                  details: water
                    ? {
                        readingId: sample.id,
                        percentage: sample.percentage,
                        category: waterCategory(sample.percentage),
                        result,
                      }
                    : {
                        resourceType: 'trough',
                        positionId: sample.id,
                        latitude: sample.latitude,
                        longitude: sample.longitude,
                        result,
                      },
                },
                { transaction },
              )
            if (result === 'current') {
              await update(
                db,
                'TroughStates',
                id,
                { [stateKey]: sample.id },
                transaction,
                'troughId',
              )
              current = sample
              if (!water) await update(db, 'Troughs', id, { locationSource: 'device' }, transaction)
            }
            await update(
              db,
              table,
              sample.id,
              { processedAt: now, processingResult: result },
              transaction,
            )
            processed++
          }
        }
      })
    return processed
  }
  return {
    process: async () => ({
      processed: (await processTable('WaterReadings')) + (await processTable('TroughPositions')),
    }),
  }
}
