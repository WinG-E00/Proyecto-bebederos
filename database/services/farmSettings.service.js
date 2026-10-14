import { update, sqlDate } from './monitoringSql.service.js'
export async function applyFarmSettings(db, farm, changes, { transaction, now }) {
  if (
    (changes.latitude !== undefined && changes.latitude !== farm.latitude) ||
    (changes.longitude !== undefined && changes.longitude !== farm.longitude)
  )
    await db.query('DELETE FROM WeatherCaches WHERE farmId=:id', {
      replacements: { id: farm.id },
      transaction,
    })
  if (changes.staleMinutes !== undefined && changes.staleMinutes !== farm.staleMinutes) {
    // Durable request survives API/worker restarts; US7 consumes this marker.
    await db.query(
      "INSERT INTO WorkerStates (name,errorCode,createdAt,updatedAt) VALUES (:name,'REEVALUATION_PENDING',:now,:now) ON DUPLICATE KEY UPDATE errorCode='REEVALUATION_PENDING',updatedAt=:now",
      { replacements: { name: `freshness:farm:${farm.id}`, now: sqlDate(now) }, transaction },
    )
  }
  await update(db, 'Farms', farm.id, { ...changes, updatedAt: now }, transaction)
}
