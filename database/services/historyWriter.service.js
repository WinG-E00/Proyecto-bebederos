import { z } from 'zod'
import { registerModels } from '../models/index.js'
import { ApiError } from '../middleware/errors.js'

const eventSchema = z.strictObject({
  farmId: z.number().int().positive(), resourceId: z.number().int().positive(),
  type: z.enum(['water', 'gps', 'visit', 'alert', 'task', 'retirement']),
  actorId: z.number().int().positive().nullable().default(null),
  occurredAt: z.date(), details: z.record(z.string(), z.json()),
})
export function assertSafeDetails(value) {
  const sensitive = /password|contrase[nñ]a|secret|token|hash|cookie|session|authorization|credential|api.?key|payload|smtp/i
  if (typeof value === 'string' && /[?&](token|key|password|secret)=|bearer\s|-----BEGIN .*PRIVATE KEY/i.test(value)) throw new ApiError(422, 'UNSAFE_HISTORY')
  if (value && typeof value === 'object') for (const [key, entry] of Object.entries(value)) {
    if (sensitive.test(key)) throw new ApiError(422, 'UNSAFE_HISTORY')
    assertSafeDetails(entry)
  }
}
export async function writeHistory(db, event, { transaction } = {}) {
  if (!transaction || transaction.finished || transaction.sequelize !== db) throw new Error('El historial exige la transacción activa del cambio de dominio')
  const parsed = eventSchema.safeParse(event)
  if (!parsed.success) throw new ApiError(422, 'INVALID_HISTORY')
  assertSafeDetails(parsed.data.details)
  return registerModels(db).HistoryEvent.create(parsed.data, { transaction })
}
