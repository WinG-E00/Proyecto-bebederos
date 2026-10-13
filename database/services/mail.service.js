import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { QueryTypes } from 'sequelize'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { registerModels } from '../models/index.js'
import { ApiError } from '../middleware/errors.js'

const payloadSchema = z.strictObject({ text: z.string().min(1), html: z.string().optional() })
const subjects = { invitation: 'Invitación a Proyecto Bebederos', verification: 'Verificá tu correo', recovery: 'Restablecé tu contraseña' }
function key(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) throw new Error('OUTBOX_SECRET requiere al menos 32 bytes')
  return createHash('sha256').update(secret).digest()
}
export function encryptPayload(payload, secret) {
  const parsed = payloadSchema.parse(payload)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(parsed), 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.')
}
export function decryptPayload(encrypted, secret) {
  try {
    const [version, iv, tag, data, extra] = encrypted.split('.')
    if (version !== 'v1' || extra || !iv || !tag || !data) throw new Error()
    const decipher = createDecipheriv('aes-256-gcm', key(secret), Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(tag, 'base64'))
    return payloadSchema.parse(JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8')))
  } catch { throw new Error('No se pudo descifrar el correo pendiente') }
}
export function smtpTransport(env) {
  if (!env.SMTP_HOST || !env.SMTP_FROM) throw new Error('SMTP no configurado')
  return nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
    requireTLS: env.SMTP_PORT !== 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
    tls: { rejectUnauthorized: true }, logger: false, debug: false,
  })
}
export function createMailService(db, { secret, clock = { now: () => new Date() } }) {
  key(secret)
  const { MailOutbox } = registerModels(db)
  async function reference(kind, id, transaction) {
    if (!Object.hasOwn(subjects, kind) || !Number.isSafeInteger(id) || id < 1) throw new ApiError(422, 'INVALID_MAIL_REFERENCE')
    const sql = kind === 'invitation'
      ? "SELECT email AS recipient, expiresAt, state = 'Pendiente' AS valid FROM Invitations WHERE id = :id FOR UPDATE"
      : 'SELECT a.email AS recipient, t.expiresAt, t.consumedAt IS NULL AS valid FROM IdentityTokens t JOIN Accounts a ON a.id = t.accountId WHERE t.id = :id AND t.type = :kind FOR UPDATE'
    const rows = await db.query(sql, { replacements: { id, kind }, type: QueryTypes.SELECT, transaction })
    const row = rows[0]
    if (!row?.valid || new Date(row.expiresAt) <= clock.now()) throw new ApiError(409, 'MAIL_TOKEN_EXPIRED')
    return row
  }
  async function enqueue({ kind, invitationId, identityTokenId, payload }, { transaction } = {}) {
    if (!transaction || transaction.finished || transaction.sequelize !== db) throw new Error('Encolar correo exige una transacción activa')
    if ((kind === 'invitation' && identityTokenId) || (kind !== 'invitation' && invitationId)) throw new ApiError(422, 'INVALID_MAIL_REFERENCE')
    const row = await reference(kind, kind === 'invitation' ? invitationId : identityTokenId, transaction)
    return MailOutbox.create({
      kind, invitationId: invitationId ?? null, identityTokenId: identityTokenId ?? null,
      recipient: row.recipient, subject: subjects[kind], encryptedPayload: encryptPayload(payload, secret),
      expiresAt: row.expiresAt, nextAttemptAt: clock.now(), state: 'pending', attempts: 0,
    }, { transaction })
  }
  return { enqueue, reference, decrypt: (payload) => decryptPayload(payload, secret) }
}
