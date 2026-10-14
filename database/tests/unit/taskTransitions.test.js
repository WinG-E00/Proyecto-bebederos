import { it, expect } from 'vitest'
import { taskTransition } from '../../services/taskTransitions.service.js'
const transitions = [
  ['worker', 'Pendiente', 'start', 'En progreso'],
  ['worker', 'En progreso', 'submit', 'Pendiente de validación'],
  ['owner', 'Pendiente de validación', 'approve', 'Completada'],
  ['owner', 'Pendiente de validación', 'reject', 'En progreso'],
]
it.each(transitions)('%s %s %s → %s', (role, state, action, next) => {
  expect(taskTransition({ role, state, action, reason: 'Revisar' })).toBe(next)
})
it('matriz completa niega cambios no previstos y closed no reabre', () => {
  for (const role of ['owner', 'worker'])
    for (const state of [
      'Pendiente',
      'En progreso',
      'Pendiente de validación',
      'Completada',
    ])
      for (const action of ['start', 'submit', 'approve', 'reject', 'assign']) {
        const allowed =
          transitions.some(
            (v) => v[0] === role && v[1] === state && v[2] === action,
          ) ||
          (role === 'owner' && action === 'assign' && state !== 'Completada')
        if (!allowed)
          expect(() =>
            taskTransition({ role, state, action, reason: 'Revisar' }),
          ).toThrow()
      }
})
it('motivo obligatorio y reasignación mantiene estado', () => {
  expect(() =>
    taskTransition({
      role: 'owner',
      state: 'Pendiente de validación',
      action: 'reject',
      reason: ' ',
    }),
  ).toThrow()
  expect(
    taskTransition({
      role: 'owner',
      state: 'Pendiente de validación',
      action: 'assign',
    }),
  ).toBe('Pendiente de validación')
})
