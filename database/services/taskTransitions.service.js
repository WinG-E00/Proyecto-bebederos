import { ApiError } from '../middleware/errors.js'
export const TASK_STATES = [
  'Pendiente',
  'En progreso',
  'Pendiente de validación',
  'Completada',
]
export function taskTransition({ role, state, action, reason }) {
  const expectedRole = ['start', 'submit'].includes(action) ? 'worker' : 'owner'
  if (role !== expectedRole) throw new ApiError(403, 'ROLE_FORBIDDEN')
  if (state === 'Completada') throw new ApiError(409, 'TASK_CLOSED')
  if (action === 'assign') return state
  const rules = {
    start: ['Pendiente', 'En progreso'],
    submit: ['En progreso', 'Pendiente de validación'],
    approve: ['Pendiente de validación', 'Completada'],
    reject: ['Pendiente de validación', 'En progreso'],
  }
  const rule = rules[action]
  if (!rule || rule[0] !== state)
    throw new ApiError(409, 'INVALID_TASK_TRANSITION')
  if (action === 'reject' && !reason?.trim())
    throw new ApiError(422, 'REASON_REQUIRED', {
      reason: 'Escribí el motivo del rechazo.',
    })
  return rule[1]
}
