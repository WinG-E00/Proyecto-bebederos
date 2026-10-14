import { select, update, insert } from './monitoringSql.service.js'
import { writeHistory } from './historyWriter.service.js'
// Caller must hold the farm lock. Same lock order as task actions and retirement.
export async function revokeAssignment(
  db,
  { farmId, workerId, actorId, now, transaction },
) {
  const rows = await select(
    db,
    'SELECT * FROM Assignments WHERE farmId=:farmId AND workerId=:workerId FOR UPDATE',
    { farmId, workerId },
    transaction,
  )
  if (!rows[0]?.active) return
  await update(
    db,
    'Assignments',
    rows[0].id,
    { active: false, revokedAt: now, updatedAt: now },
    transaction,
  )
  const tasks = await select(
    db,
    "SELECT * FROM Tasks WHERE farmId=:farmId AND workerId=:workerId AND state<>'Completada' ORDER BY id FOR UPDATE",
    { farmId, workerId },
    transaction,
  )
  for (const task of tasks) {
    await update(
      db,
      'Tasks',
      task.id,
      { workerId: null, version: task.version + 1, updatedAt: now },
      transaction,
    )
    await insert(
      db,
      'TaskEvents',
      {
        taskId: task.id,
        farmId,
        actorId,
        occurredAt: now,
        action: 'revoke',
        previousState: task.state,
        newState: task.state,
        previousWorkerId: workerId,
        newWorkerId: null,
        comment: null,
      },
      transaction,
    )
    await writeHistory(
      db,
      {
        farmId,
        type: 'task',
        resourceId: task.id,
        actorId,
        occurredAt: now,
        details: {
          action: 'revoke',
          previousWorkerId: workerId,
          newWorkerId: null,
          version: task.version + 1,
        },
      },
      { transaction },
    )
  }
}
