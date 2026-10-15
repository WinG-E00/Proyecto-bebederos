import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { randomUUID, createHash } from 'node:crypto'
import { openIdentityDatabase, insertAccount, insertFarm, email, PASSWORD } from '../helpers/identityFixtures.js'
import { fixtureInsert } from '../helpers/monitoringFixtures.js'
import { select } from '../../services/monitoringSql.service.js'
import { submitSample } from '../../scripts/sample.js'
import { startServer } from '../../server.js'
import { startWorker } from '../../workers/index.js'
import { createMailService } from '../../services/mail.service.js'
import { createMailWorker } from '../../workers/mail.worker.js'
import { workerHealthReport } from '../../router/health.router.js'

// Reinicios de API y worker sin pérdida ni duplicados: sesión SQL, muestras pendientes,
// correo encolado y reenvío de muestras ya procesadas (escenario posterior a restaurar).
let db, env, owner, farmId, troughId
const secret = 'recovery-outbox-secret-test-only-32b!'
beforeAll(async () => {
  db = await openIdentityDatabase()
  env = {
    DB_NAME: process.env.TEST_DB_NAME, DB_HOST: process.env.TEST_DB_HOST, DB_PORT: Number(process.env.TEST_DB_PORT),
    DB_USER: process.env.TEST_DB_USER, DB_PASSWORD: process.env.TEST_DB_PASSWORD, OUTBOX_SECRET: secret, PORT: 0, TRUST_PROXY: 0,
    NODE_ENV: 'test', SESSION_SECRET: 'recovery-session-secret-test-only-32b', APP_URL: 'http://localhost:5173', VISIT_RADIUS_METERS: 5,
  }
  owner = { address: email('recovery-owner') }
  owner.id = await insertAccount(db, { name: 'Dueño recuperación', address: owner.address, role: 'owner' })
  farmId = await insertFarm(db, { ownerId: owner.id, name: 'Campo recuperación' })
  troughId = await fixtureInsert(db, 'Troughs', { farmId, name: 'B recuperación', capacityLiters: 500, createdAt: new Date(), updatedAt: new Date() })
  await fixtureInsert(db, 'TroughStates', { troughId })
  // Correos sintéticos de otras ejecuciones no deben enviarse con el worker real.
  await db.query("UPDATE MailOutbox SET state='expired', encryptedPayload=NULL, errorCode='TEST_RETIRED' WHERE recipient LIKE '%@test.invalid' AND state IN ('pending','failed')")
}, 30000)
afterAll(async () => { await db?.close() })

const base = (server) => `http://127.0.0.1:${server.server.address().port}/api/v1`
async function waitFor(check, timeoutMs = 20000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('Tiempo de espera agotado')
}

it('la sesión vive en MySQL: sobrevive al reinicio de la API y la salud vuelve a responder', async () => {
  let server = await startServer({ env })
  let cookie
  try {
    const csrfRes = await fetch(`${base(server)}/auth/csrf`)
    cookie = csrfRes.headers.get('set-cookie').split(';')[0]
    const { csrfToken } = await csrfRes.json()
    const login = await fetch(`${base(server)}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken, Cookie: cookie }, body: JSON.stringify({ email: owner.address, password: PASSWORD }) })
    expect(login.status).toBe(200)
    cookie = login.headers.get('set-cookie').split(';')[0]
  } finally { await server.close() }
  server = await startServer({ env })
  try {
    const me = await fetch(`${base(server)}/auth/me`, { headers: { Cookie: cookie } })
    expect(me.status).toBe(200)
    expect((await me.json()).account.id).toBe(owner.id)
    const health = await fetch(`${base(server)}/health`)
    expect(health.status).toBe(200)
    expect(await health.json()).toMatchObject({ status: 'ok', database: 'up' })
  } finally { await server.close() }
}, 30000)

it('muestras recibidas con el worker detenido se procesan una sola vez tras reinicios', async () => {
  const key = `recovery:${randomUUID()}`
  const start = Date.now() - 60000
  for (const [i, percentage] of [80, 45, 15].entries())
    await submitSample(db, 'water', { resourceId: troughId, sourceKey: `${key}:${i}`, percentage, measuredAt: new Date(start + i * 1000).toISOString() }, { environment: 'test' })
  const pending = async () => Number((await select(db, 'SELECT COUNT(*) n FROM WaterReadings WHERE troughId=:troughId AND processedAt IS NULL', { troughId }))[0].n)
  expect(await pending()).toBe(3)
  let worker = await startWorker({ env })
  try { await waitFor(async () => (await pending()) === 0) } finally { await worker.close() }
  const events = async () => Number((await select(db, "SELECT COUNT(*) n FROM HistoryEvents WHERE type='water' AND resourceId=:troughId AND farmId=:farmId", { troughId, farmId }))[0].n)
  expect(await events()).toBe(3)
  // Reenvío del mismo origen (p. ej. tras restaurar una copia) y nuevo reinicio: sin duplicados.
  await submitSample(db, 'water', { resourceId: troughId, sourceKey: `${key}:2`, percentage: 15, measuredAt: new Date(start + 2000).toISOString() }, { environment: 'test' })
  worker = await startWorker({ env })
  try {
    await waitFor(async () => (await workerHealthReport(db)).worker.lastSuccessfulCycleAt > new Date(Date.now() - 4000))
  } finally { await worker.close() }
  expect(await events()).toBe(3)
  expect(Number((await select(db, 'SELECT COUNT(*) n FROM WaterReadings WHERE troughId=:troughId', { troughId }))[0].n)).toBe(3)
  const [alert] = await select(db, "SELECT COUNT(*) n FROM Alerts WHERE resourceId=:troughId AND resolvedAt IS NULL AND conditionName='water_critical'", { troughId })
  expect(Number(alert.n)).toBe(1)
  expect((await workerHealthReport(db)).worker).toMatchObject({ available: true, errorCode: null })
}, 60000)

it('correo pendiente sobrevive al reinicio del worker y se envía una vez', async () => {
  let now = new Date('2026-10-14T12:00:00Z')
  const clock = { now: () => new Date(now) }
  const mail = createMailService(db, { secret, clock })
  const invitationId = await fixtureInsert(db, 'Invitations', { ownerId: owner.id, email: email('recovery-worker'), tokenHash: createHash('sha256').update(randomUUID()).digest('hex'), issuedAt: now, expiresAt: new Date(+now + 7 * 864e5), createdAt: now, updatedAt: now })
  const item = await db.transaction((transaction) => mail.enqueue({ kind: 'invitation', invitationId, payload: { text: 'Enlace de prueba' } }, { transaction }))
  const failing = { sendMail: vi.fn().mockRejectedValue(new Error('SMTP caído')) }
  await createMailWorker(db, { mail, transport: failing, from: 'test@test.invalid', clock }).processNext()
  await item.reload()
  expect(item).toMatchObject({ state: 'pending', attempts: 1, errorCode: 'SMTP_FAILED' })
  expect(item.encryptedPayload).not.toBeNull()
  // "Reinicio": procesadores nuevos sin estado en memoria retoman la cola persistida.
  now = new Date(+now + 60000)
  const ok = { sendMail: vi.fn().mockResolvedValue({ accepted: [item.recipient] }) }
  const restarted = [createMailWorker(db, { mail, transport: ok, from: 'test@test.invalid', clock }), createMailWorker(db, { mail, transport: ok, from: 'test@test.invalid', clock })]
  await Promise.all(restarted.map((w) => w.processNext()))
  await restarted[0].processNext()
  await item.reload()
  expect(ok.sendMail).toHaveBeenCalledTimes(1)
  expect(item).toMatchObject({ state: 'sent', attempts: 2, encryptedPayload: null })
})
