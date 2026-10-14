import { ApiError } from '../middleware/errors.js'
import { select, update, sqlDate } from './monitoringSql.service.js'
import { writeHistory } from './historyWriter.service.js'
export async function resolveRetiredAlerts(db, farmId, { type, id, transaction, now }) {
  const alerts = await select(
    db,
    `SELECT * FROM Alerts WHERE farmId=:farmId AND resolvedAt IS NULL ${type ? 'AND resourceType=:type AND resourceId=:id' : ''} FOR UPDATE`,
    { farmId, type: type ?? null, id: id ?? null },
    transaction,
  )
  for (const alert of alerts) {
    await update(db, 'Alerts', alert.id, { resolvedAt: now, activeKey: null }, transaction)
    await writeHistory(
      db,
      {
        farmId,
        type: 'alert',
        resourceId: alert.resourceId,
        occurredAt: now,
        details: { alertId: alert.id, resourceType: alert.resourceType, conditionName: alert.conditionName, resolved: true, reason: 'retirement' },
      },
      { transaction },
    )
  }
}
export async function retireFarm(db, farm, account, { transaction, now }) {
  const [counts] = await select(
    db,
    "SELECT (SELECT COUNT(*) FROM Animals WHERE farmId=:id AND deletedAt IS NULL) animals,(SELECT COUNT(*) FROM Troughs WHERE farmId=:id AND deletedAt IS NULL) troughs,(SELECT COUNT(*) FROM Tasks WHERE farmId=:id AND state<>'Completada') tasks",
    { id: farm.id },
    transaction,
  )
  if (Number(counts.animals) + Number(counts.troughs) + Number(counts.tasks) > 0)
    throw new ApiError(
      409,
      'FARM_HAS_DEPENDENCIES',
      undefined,
      `No se puede eliminar: ${Number(counts.animals)} animales activos, ${Number(counts.troughs)} bebederos activos y ${Number(counts.tasks)} tareas abiertas.`,
    )
  await update(db, 'Farms', farm.id, { deletedAt: now, updatedAt: now }, transaction)
  await db.query(
    'UPDATE Assignments SET active=FALSE,revokedAt=:now,updatedAt=:now WHERE farmId=:id AND active=TRUE',
    { replacements: { id: farm.id, now: sqlDate(now) }, transaction },
  )
  await db.query('UPDATE InvitationFarms SET active=FALSE WHERE farmId=:id', {
    replacements: { id: farm.id },
    transaction,
  })
  await resolveRetiredAlerts(db, farm.id, { transaction, now })
  await writeHistory(
    db,
    {
      farmId: farm.id,
      type: 'retirement',
      resourceId: farm.id,
      actorId: account.id,
      occurredAt: now,
      details: { resourceType: 'farm' },
    },
    { transaction },
  )
}
