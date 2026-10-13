import { randomBytes, createHash } from 'node:crypto'
import { createDatabase } from '../../../../database/db/database.js'
import { decryptPayload } from '../../../../database/services/mail.service.js'

// Recorrido completo US1: API Express real + MySQL de pruebas + captura SMTP desde la cola.
// Requiere E2E_FULLSTACK=1 y una base exclusiva de pruebas; nunca la operativa.
export function fullStackConfig(source = process.env) {
  if (source.E2E_FULLSTACK !== '1') return null
  const name = source.E2E_DB_NAME
  if (!name || !/_(test|e2e)$/.test(name)) throw new Error('E2E_DB_NAME debe terminar en _test o _e2e')
  for (const key of ['E2E_DB_HOST', 'E2E_DB_PORT', 'E2E_DB_USER', 'E2E_DB_PASSWORD', 'E2E_OUTBOX_SECRET']) {
    if (!source[key]) throw new Error(`${key} es obligatorio para el recorrido completo`)
  }
  return {
    db: { DB_NAME: name, DB_HOST: source.E2E_DB_HOST, DB_PORT: Number(source.E2E_DB_PORT), DB_USER: source.E2E_DB_USER, DB_PASSWORD: source.E2E_DB_PASSWORD },
    outboxSecret: source.E2E_OUTBOX_SECRET,
  }
}

export function openTestDatabase(config) {
  return createDatabase(config.db)
}

// Captura SMTP de prueba: descifra el último correo encolado para el destinatario.
export async function capturedLink(db, config, recipient, kind) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const [rows] = await db.query('SELECT encryptedPayload FROM MailOutbox WHERE recipient = :recipient AND kind = :kind AND encryptedPayload IS NOT NULL ORDER BY id DESC LIMIT 1', { replacements: { recipient, kind } })
    if (rows[0]) {
      const { text } = decryptPayload(rows[0].encryptedPayload, config.outboxSecret)
      const url = /https?:\/\/\S+/.exec(text)?.[0]
      if (url) { const link = new URL(url); return `${link.pathname}${link.search}` }
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`No se encoló correo ${kind} para el destinatario de prueba`)
}

// Dueño verificado creado por la API pública (registro + enlace capturado).
export async function verifiedOwner(request, db, config, { name, email, password }) {
  const { csrfToken } = await (await request.get('/api/v1/auth/csrf')).json()
  const registered = await request.post('/api/v1/auth/register', { headers: { 'X-CSRF-Token': csrfToken }, data: { name, email, password } })
  if (registered.status() !== 202) throw new Error('No se pudo registrar el dueño de prueba')
  const link = new URL(await capturedLink(db, config, email, 'verification'), 'http://local.invalid')
  const verified = await request.post('/api/v1/auth/verify', { headers: { 'X-CSRF-Token': csrfToken }, data: { token: link.searchParams.get('token') } })
  if (verified.status() !== 204) throw new Error('No se pudo verificar el dueño de prueba')
  const [rows] = await db.query('SELECT id FROM Accounts WHERE email = :email', { replacements: { email } })
  return Number(rows[0].id)
}

// Invitación preparada por fixture (la emisión desde la interfaz llega en US5).
export async function invitationFixture(db, { ownerId, workerEmail }) {
  const now = new Date()
  const [farmId] = await db.query(
    "INSERT INTO Farms (ownerId, name, latitude, longitude, areaHa, description, timezone, createdAt, updatedAt) VALUES (:ownerId, 'Campo de prueba E2E', -26, -59, 10, 'Fixture E2E', 'America/Argentina/Buenos_Aires', :now, :now)",
    { replacements: { ownerId, now } },
  )
  const token = randomBytes(32).toString('base64url')
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const [invitationId] = await db.query(
    "INSERT INTO Invitations (ownerId, email, tokenHash, issuedAt, expiresAt, state, deliveryState, createdAt, updatedAt) VALUES (:ownerId, :email, :hash, :now, :expires, 'Pendiente', 'Enviado', :now, :now)",
    { replacements: { ownerId, email: workerEmail, hash: createHash('sha256').update(token).digest('hex'), now, expires } },
  )
  await db.query('INSERT INTO InvitationFarms (invitationId, farmId, ownerId) VALUES (:invitationId, :farmId, :ownerId)', { replacements: { invitationId, farmId, ownerId } })
  return { token, farmId, ownerId }
}

export async function activeFarmIds(db, workerEmail) {
  const [rows] = await db.query('SELECT a.farmId FROM Assignments a JOIN Accounts w ON w.id = a.workerId WHERE w.email = :email AND a.active = TRUE', { replacements: { email: workerEmail } })
  return rows.map((row) => Number(row.farmId))
}
