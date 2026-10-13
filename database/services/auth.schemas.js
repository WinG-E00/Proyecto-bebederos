import { z } from 'zod'
import { normalizeEmail } from '../models/Account.model.js'

// "Contraseña de al menos 10 caracteres y máximo 72 bytes UTF-8 para bcrypt."
export const passwordSchema = z.string().min(10).refine((value) => Buffer.byteLength(value, 'utf8') <= 72)
const emailSchema = z.preprocess(normalizeEmail, z.email().max(254))
const nameSchema = z.string().trim().min(1).max(255)
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{20,128}$/)

// Objetos estrictos: role, ownerId, perfilId, verificación o telemetría nunca se aceptan del cliente.
export const registerSchema = z.strictObject({ name: nameSchema, email: emailSchema, password: passwordSchema, invitationToken: tokenSchema.optional() })
export const loginSchema = z.strictObject({ email: emailSchema, password: z.string().min(1).max(256) })
export const emailSchemaBody = z.strictObject({ email: emailSchema })
export const tokenSchemaBody = z.strictObject({ token: tokenSchema })
export const resetSchema = z.strictObject({ token: tokenSchema, password: passwordSchema })
export const profileSchema = z.strictObject({ name: nameSchema })
export const previewQuerySchema = z.strictObject({ token: z.string().max(256) })
