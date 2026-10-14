import { z } from 'zod'
const text = (max = 255) => z.string().trim().min(1).max(max)
export const latitude = z.number().min(-90).max(90)
export const longitude = z.number().min(-180).max(180)
export const farmSchema = z.strictObject({
  name: text(),
  latitude,
  longitude,
  areaHa: z.number().min(0),
  description: z.string().max(10000).default(''),
  staleMinutes: z.number().int().positive().max(2147483647).default(180),
  timezone: text(64).refine((value) => {
    try {
      new Intl.DateTimeFormat('es', { timeZone: value })
      return true
    } catch {
      return false
    }
  }),
})
export const farmPatchSchema = farmSchema
  .extend({
    description: farmSchema.shape.description.removeDefault(),
    staleMinutes: farmSchema.shape.staleMinutes.removeDefault(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0)
export const troughSchema = z
  .strictObject({
    name: text(),
    capacityLiters: z.number().positive(),
    operationalState: z
      .enum(['Operativo', 'En mantenimiento', 'Fuera de servicio'])
      .default('Operativo'),
    latitude: latitude.nullable().optional(),
    longitude: longitude.nullable().optional(),
  })
  .refine((v) => (v.latitude == null) === (v.longitude == null), { path: ['longitude'] })
export const animalSchema = z.strictObject({
  name: text(),
  species: text(100),
  breed: text(100),
  ageYears: z.number().min(0),
  state: text(100),
})
export const animalPatchSchema = animalSchema.partial().refine((v) => Object.keys(v).length > 0)
export const listSchema = z.strictObject({
  farmId: z
    .string()
    .regex(/^[1-9]\d*$/)
    .optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
})
