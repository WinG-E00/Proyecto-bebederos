import { ApiError } from '../middleware/errors.js'
import { createAccessService } from './access.service.js'
import { update } from './monitoringSql.service.js'
import { taskTransition } from './taskTransitions.service.js'
import {
  eligibleWorker,
  writeTaskEvent,
  createTaskService,
} from './task.service.js'
import { writeNotification } from './notificationWriter.service.js'
export function createTaskActions(
  db,
  { clock = { now: () => new Date() } } = {},
) {
  const access = createAccessService(db),
    tasks = createTaskService(db, { clock })
  return {
    async act(a, id, body) {
      const initial = await access.resource(a, 'task', id)
      return db.transaction(async (transaction) => {
        const farm = await access.farm(a, initial.farmId, {
          transaction,
          lock: true,
        })
        const task = await access.resource(a, 'task', id, {
          transaction,
          lock: true,
        })
        if (task.version !== body.expectedVersion)
          throw new ApiError(
            409,
            'STALE_TASK',
            undefined,
            'La tarea cambió. Revisá su estado actualizado antes de intentar de nuevo.',
          )
        const state = taskTransition({
          role: a.role,
          state: task.state,
          ...body,
        })
        // Even owner validation must not advance a task left unassigned by revocation.
        const workerId =
          body.action === 'assign' ? body.workerId : task.workerId
        if (!workerId)
          throw new ApiError(
            409,
            'TASK_UNASSIGNED',
            undefined,
            'Asigná un peón antes de continuar.',
          )
        await eligibleWorker(db, task.farmId, workerId, transaction)
        const now = clock.now(),
          next = { ...task, state, workerId, version: task.version + 1 }
        await update(
          db,
          'Tasks',
          id,
          { state, workerId, version: next.version, updatedAt: now },
          transaction,
        )
        await writeTaskEvent(db, next, {
          actorId: a.id,
          action: body.action,
          previousState: task.state,
          previousWorkerId: task.workerId,
          comment: body.reason ?? null,
          now,
          transaction,
        })
        if (['assign', 'approve', 'reject', 'submit'].includes(body.action)) {
          const recipientId = body.action === 'submit' ? farm.ownerId : workerId
          const labels = {
            assign: 'Te asignaron',
            approve: 'Aprobaron',
            reject: 'Rechazaron',
            submit: 'Pendiente de validación',
          }
          await writeNotification(
            db,
            {
              farmId: task.farmId,
              taskId: task.id,
              recipientId,
              type: body.action,
              message: `${labels[body.action]}: ${task.title}${body.reason ? `. Motivo: ${body.reason}` : ''}`,
              occurredAt: now,
            },
            { transaction },
          )
        }
        return tasks.detail(a, id, transaction)
      })
    },
  }
}
