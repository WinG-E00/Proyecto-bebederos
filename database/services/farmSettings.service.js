import { evaluateFarmFreshness } from './freshness.service.js'
import { update, sqlDate } from './monitoringSql.service.js'
export async function applyFarmSettings(db, farm, changes, { transaction, now }) {
  if (
    (changes.latitude !== undefined && changes.latitude !== farm.latitude) ||
    (changes.longitude !== undefined && changes.longitude !== farm.longitude) ||
    (changes.timezone !== undefined && changes.timezone !== farm.timezone)
  )
    await db.query('DELETE FROM WeatherCaches WHERE farmId=:id', {
      replacements: { id: farm.id },
      transaction,
    })
  if (changes.staleMinutes !== undefined && changes.staleMinutes !== farm.staleMinutes) {
    // The marker and immediate evaluation share the settings transaction.
    await db.query(
      "INSERT INTO WorkerStates (name,errorCode,createdAt,updatedAt) VALUES (:name,'REEVALUATION_PENDING',:now,:now) ON DUPLICATE KEY UPDATE errorCode='REEVALUATION_PENDING',updatedAt=:now",
      { replacements: { name: `freshness:farm:${farm.id}`, now: sqlDate(now) }, transaction },
    )
  }
  await update(db, 'Farms', farm.id, { ...changes, updatedAt: now }, transaction)
  if (changes.staleMinutes !== undefined && changes.staleMinutes !== farm.staleMinutes)
    await evaluateFarmFreshness(db, {...farm,...changes}, {transaction,now})
}
