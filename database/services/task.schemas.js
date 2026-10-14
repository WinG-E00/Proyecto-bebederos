import { z } from 'zod'
import { TASK_STATES } from './taskTransitions.service.js'
const id = z.number().int().positive().max(4294967295)
export const taskSchema = z.strictObject({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(10000),
  priority: z.enum(['Baja', 'Media', 'Alta']).default('Media'),
  deadline: z.iso.datetime({ offset: true }).transform((v) => new Date(v)),
  workerId: id,
  troughId: id.nullable().optional(),
})
export const taskListSchema = z.strictObject({
  farmId: z.coerce.number().int().positive().optional(),
  state: z.enum(TASK_STATES).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})
export const taskActionSchema = z
  .strictObject({
    action: z.enum(['start', 'submit', 'approve', 'reject', 'assign']),
    expectedVersion: z.number().int().nonnegative().max(4294967295),
    reason: z.string().trim().min(1).max(10000).optional(),
    workerId: id.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.action === 'reject' && !v.reason)
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Escribí el motivo del rechazo.',
      })
    if (v.action === 'assign' && !v.workerId)
      ctx.addIssue({
        code: 'custom',
        path: ['workerId'],
        message: 'Seleccioná un peón.',
      })
    if (v.action !== 'assign' && v.workerId !== undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['workerId'],
        message: 'La acción no permite cambiar responsable.',
      })
    if (v.action !== 'reject' && v.reason !== undefined)
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'La acción no permite comentario.',
      })
  })
