import {sqlValues} from '../../services/monitoringSql.service.js'
import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import { QueryTypes } from 'sequelize'
import { createApp } from '../../app.js'
import { createIdentityApi } from '../../router/auth.router.js'
import { migrateDatabase, assertSchemaReady } from '../../scripts/migrate.js'
import { createMailService } from '../../services/mail.service.js'
import { generateToken } from '../../models/IdentityToken.model.js'
import { createTestDatabase, loadTestEnvironment } from './testDatabase.js'

export const PASSWORD = 'clave-de-prueba-10'
export const OUTBOX_SECRET = 'us1-outbox-secret-test-only-32-bytes!'
const SESSION_SECRET = 'us1-session-secret-test-only-32-bytes'

// Las pruebas de US1 exigen MySQL de pruebas (.env.test). Sin él se omiten y se informa.
export function testDatabaseAvailable() {
  try { loadTestEnvironment(); return true } catch { return false }
}

// Las filas de prueba no se borran (hay historial inmutable): cada ejecución usa correos únicos.
export const runId = randomUUID().replaceAll('-', '').slice(0, 12)
export const email = (label) => `${label}-${runId}@test.invalid`

export async function openIdentityDatabase() {
  loadTestEnvironment()
  const db = createTestDatabase()
  await migrateDatabase(db)
  await assertSchemaReady(db)
  return db
}

export function controlledClock(start = '2026-10-13T12:00:00.000Z') {
  let current = new Date(start)
  return { now: () => new Date(current), set: (value) => { current = new Date(value) }, advance: (ms) => { current = new Date(current.getTime() + ms) } }
}

export function buildIdentityApp(db, { limits = { generalPerMinute: 100_000, identityPer15Minutes: 100_000 }, clock = controlledClock() } = {}) {
  const mail = createMailService(db, { secret: OUTBOX_SECRET, clock })
  const identity = createIdentityApi({
    db, mail, clock, limits, bcryptRounds: 4,
    env: { NODE_ENV: 'test', SESSION_SECRET, APP_URL: 'http://localhost:5173' },
  })
  const app = createApp({ configure: identity.install })
  return { app, identity, clock, mail }
}

// Captura SMTP de prueba: lee la cola cifrada y extrae el enlace del último correo.
export async function lastMailToken(db, mail, recipient, kind) {
  const rows = await db.query(
    'SELECT encryptedPayload FROM MailOutbox WHERE recipient = :recipient AND kind = :kind ORDER BY id DESC LIMIT 1',
    { replacements: { recipient, kind }, type: QueryTypes.SELECT },
  )
  if (!rows[0]?.encryptedPayload) return null
  const { text } = mail.decrypt(rows[0].encryptedPayload)
  return /[?&]token=([A-Za-z0-9_-]+)/.exec(text)?.[1] ?? null
}

// Sin SMTP en estas pruebas: retirar al terminar los correos de identidad pendientes para que
// no queden en la cola compartida que procesan otras pruebas (p. ej. la del worker).
export async function retireTestMail(db) {
  await db.query(
    "UPDATE MailOutbox SET state = 'expired', encryptedPayload = NULL, errorCode = 'TEST_RETIRED' WHERE kind IN ('verification','recovery') AND state IN ('pending','failed') AND recipient LIKE '%@test.invalid'",
  )
}

export async function countMail(db, recipient) {
  const [row] = await db.query('SELECT COUNT(*) AS total FROM MailOutbox WHERE recipient = :recipient', { replacements: { recipient }, type: QueryTypes.SELECT })
  return Number(row.total)
}

async function insert(db, table, values) {
  const keys = Object.keys(values)
  const [id] = await db.query(
    `INSERT INTO \`${table}\` (${keys.map((key) => `\`${key}\``).join(',')}) VALUES (${keys.map((key) => `:${key}`).join(',')})`,
    { replacements: sqlValues(values) },
  )
  return id
}

export async function insertAccount(db, { name, address, role, verified = true, password = PASSWORD }) {
  const now = new Date()
  return insert(db, 'Accounts', {
    name, email: address, role, passwordHash: await bcrypt.hash(password, 4),
    emailVerifiedAt: verified ? now : null, createdAt: now, updatedAt: now,
  })
}

export async function insertFarm(db, { ownerId, name, deletedAt = null }) {
  const now = new Date()
  return insert(db, 'Farms', {
    ownerId, name, latitude: -26, longitude: -59, areaHa: 100, description: 'Fixture US1',
    timezone: 'America/Argentina/Buenos_Aires', deletedAt, createdAt: now, updatedAt: now,
  })
}

// Invitación preparada por fixture: su emisión/administración llega en US5.
export async function insertInvitation(db, { ownerId, address, farmIds, issuedAt, state = 'Pendiente' }) {
  const { token, hash } = generateToken()
  const issued = new Date(issuedAt)
  const id = await insert(db, 'Invitations', {
    ownerId, email: address, tokenHash: hash, issuedAt: issued,
    expiresAt: new Date(issued.getTime() + 7 * 24 * 60 * 60 * 1000), state, deliveryState: 'Enviado',
    createdAt: issued, updatedAt: issued,
  })
  for (const farmId of farmIds) await insert(db, 'InvitationFarms', { invitationId: id, farmId, ownerId })
  return { id, token }
}

export async function assignments(db, workerId) {
  const rows = await db.query('SELECT farmId, active FROM Assignments WHERE workerId = :workerId ORDER BY farmId', {
    replacements: { workerId }, type: QueryTypes.SELECT,
  })
  return rows.map((row) => ({ farmId: Number(row.farmId), active: Boolean(row.active) }))
}

// Agente HTTP con cookie de sesión y token CSRF obtenido de GET /auth/csrf.
export async function csrfAgent(request, app) {
  const agent = request.agent(app)
  const response = await agent.get('/api/v1/auth/csrf').expect(200)
  return { agent, csrf: response.body.csrfToken }
}

export async function loginAgent(request, app, address, password = PASSWORD) {
  const { agent, csrf } = await csrfAgent(request, app)
  const response = await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrf).send({ email: address, password }).expect(200)
  return { agent, csrf: response.body.csrfToken, account: response.body.account }
}

export function post({ agent, csrf }, path, body) {
  return agent.post(path).set('X-CSRF-Token', csrf).send(body)
}
