import { z } from 'zod'
export const farmIdsSchema = z.strictObject({
  farmIds: z
    .array(z.number().int().positive())
    .max(100)
    .refine(
      (v) => new Set(v).size === v.length,
      'No repetir establecimientos.',
    ),
})
export const invitationSchema = farmIdsSchema
  .extend({ email: z.string().trim().toLowerCase().email().max(254) })
  .refine((v) => v.farmIds.length > 0, {
    path: ['farmIds'],
    message: 'Seleccioná al menos un establecimiento.',
  })
export const pageSchema = z.strictObject({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})
