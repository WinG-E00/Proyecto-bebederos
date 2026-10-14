import { ApiError } from '../middleware/errors.js'
import { createAccessService } from './access.service.js'
import { select, insert } from './monitoringSql.service.js'
import { pagination, paginated } from './pagination.js'
import { iso } from './water.service.js'
import { writeHistory } from './historyWriter.service.js'
import { writeNotification } from './notificationWriter.service.js'

export async function eligibleWorker(db, farmId, workerId, transaction) {
  const [row] = await select(
    db,
    "SELECT a.workerId FROM Assignments a JOIN Accounts w ON w.id=a.workerId WHERE a.farmId=:farmId AND a.workerId=:workerId AND a.active=TRUE AND w.role='worker' FOR UPDATE",
    { farmId, workerId },
    transaction,
  )
  if (!row)
    throw new ApiError(422, 'INVALID_WORKER', {
      workerId: 'El peón debe tener acceso vigente al establecimiento.',
    })
}
export async function writeTaskEvent(
  db,
  task,
  {
    actorId,
    action,
    previousState,
    previousWorkerId,
    comment = null,
    now,
    transaction,
  },
) {
  await insert(
    db,
    'TaskEvents',
    {
      taskId: task.id,
      farmId: task.farmId,
      actorId,
      action,
      occurredAt: now,
      previousState,
      newState: task.state,
      previousWorkerId,
      newWorkerId: task.workerId,
      comment,
    },
    transaction,
  )
  await writeHistory(
    db,
    {
      farmId: task.farmId,
      type: 'task',
      resourceId: task.id,
      actorId,
      occurredAt: now,
      details: {
        action,
        previousState,
        newState: task.state,
        previousWorkerId,
        newWorkerId: task.workerId,
        comment,
        version: task.version,
      },
    },
    { transaction },
  )
}
export function createTaskService(
  db,
  { clock = { now: () => new Date() } } = {},
) {
  const access = createAccessService(db)
  const base = `SELECT t.*,w.name workerName,b.name troughName FROM Tasks t LEFT JOIN Accounts w ON w.id=t.workerId LEFT JOIN Troughs b ON b.id=t.troughId`
  function serialize(t) {
    return {
      id: t.id,
      farmId: t.farmId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      deadline: iso(t.deadline),
      state: t.state,
      workerId: t.workerId,
      workerName: t.workerName ?? null,
      troughId: t.troughId,
      troughName: t.troughName ?? null,
      version: t.version,
      overdue: t.state !== 'Completada' && new Date(t.deadline) < clock.now(),
    }
  }
  async function detail(a, id, transaction) {
    await access.resource(a, 'task', id, { transaction, includeRetired: true })
    const [t] = await select(db, `${base} WHERE t.id=:id`, { id }, transaction)
    const events = await select(
      db,
      'SELECT e.*,a.name actorName FROM TaskEvents e JOIN Accounts a ON a.id=e.actorId WHERE taskId=:id ORDER BY e.id',
      { id },
      transaction,
    )
    return {
      ...serialize(t),
      events: events.map((e) => ({ ...e, occurredAt: iso(e.occurredAt) })),
    }
  }
  async function list(a, q = {}) {
    let ids
    if (a.role === 'owner')
      ids = (
        await select(db, 'SELECT id FROM Farms WHERE ownerId=:id', { id: a.id })
      ).map((f) => f.id)
    else ids = await access.farmIds(a)
    if (q.farmId) {
      await access.farm(a, q.farmId, { includeRetired: true })
      ids = [q.farmId]
    }
    const p = pagination(q)
    if (!ids.length) return paginated([], 0, p)
    const where = `t.farmId IN (:ids) ${a.role === 'worker' ? 'AND t.workerId=:accountId' : ''} ${q.state ? 'AND t.state=:state' : ''}`
    const replacements = { ids, accountId: a.id, state: q.state ?? null, ...p }
    const [count] = await select(
      db,
      `SELECT COUNT(*) total FROM Tasks t WHERE ${where}`,
      replacements,
    )
    const rows = await select(
      db,
      `${base} WHERE ${where} ORDER BY t.deadline,t.id LIMIT :limit OFFSET :offset`,
      replacements,
    )
    return paginated(rows.map(serialize), Number(count.total), p)
  }
  async function create(a, farmId, body) {
    if (a.role !== 'owner') throw new ApiError(403, 'ROLE_FORBIDDEN')
    return db.transaction(async (transaction) => {
      await access.farm(a, farmId, { transaction, lock: true })
      await eligibleWorker(db, farmId, body.workerId, transaction)
      if (body.troughId) {
        const [t] = await select(
          db,
          'SELECT id FROM Troughs WHERE id=:id AND farmId=:farmId AND deletedAt IS NULL FOR UPDATE',
          { id: body.troughId, farmId },
          transaction,
        )
        if (!t)
          throw new ApiError(422, 'INVALID_TROUGH', {
            troughId: 'Seleccioná un bebedero activo de este establecimiento.',
          })
      }
      const now = clock.now()
      const task = {
        ...body,
        troughId: body.troughId ?? null,
        farmId: Number(farmId),
        state: 'Pendiente',
        version: 1,
        createdAt: now,
        updatedAt: now,
      }
      task.id = await insert(db, 'Tasks', task, transaction)
      await writeTaskEvent(db, task, {
        actorId: a.id,
        action: 'created',
        previousState: null,
        previousWorkerId: null,
        now,
        transaction,
      })
      await writeNotification(
        db,
        {
          farmId: task.farmId,
          taskId: task.id,
          recipientId: task.workerId,
          type: 'created',
          message: `Nueva tarea: ${task.title}`,
          occurredAt: now,
        },
        { transaction },
      )
      return detail(a, task.id, transaction)
    })
  }
  return { list, detail, create }
}
