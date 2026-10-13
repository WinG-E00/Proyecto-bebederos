import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest'
import { randomUUID, createHash } from 'node:crypto'
import { createTestDatabase, loadTestEnvironment } from '../helpers/testDatabase.js'
import { migrateDatabase, assertSchemaReady, versions } from '../../scripts/migrate.js'
import { registerModels } from '../../models/index.js'
import { createAccessService } from '../../services/access.service.js'
import { writeHistory } from '../../services/historyWriter.service.js'
import { createMailService } from '../../services/mail.service.js'
import { createMailWorker } from '../../workers/mail.worker.js'
import { createWorkerHealth } from '../../services/workerHealth.service.js'
import { startServer } from '../../server.js'
import { startWorker } from '../../workers/index.js'

let db; let access; let models; let owner; let otherOwner; let worker; let farm; let otherFarm; let trough; let invitation
const runId = randomUUID().replaceAll('-', '')
let now = new Date('2026-10-13T12:00:00Z')
const clock = { now: () => new Date(now) }
const secret = 'phase2-outbox-secret-test-only-32-bytes'
const stamp = '2026-10-13 12:00:00.000'
async function insert(table, values) {
  const keys = Object.keys(values)
  const [id] = await db.query(`INSERT INTO \`${table}\` (${keys.map((key) => `\`${key}\``).join(',')}) VALUES (${keys.map((key) => `:${key}`).join(',')})`, { replacements: values })
  return id
}
async function account(role, label) {
  return insert('Accounts', { name: `Prueba ${label}`, email: `${label}-${runId}@test.invalid`, passwordHash: 'test-only-not-a-real-hash', role, createdAt: stamp, updatedAt: stamp })
}
async function createFarm(ownerId, label) {
  return insert('Farms', { ownerId, name: label, latitude: -26, longitude: -59, areaHa: 100, description: 'Prueba', timezone: 'America/Argentina/Buenos_Aires', createdAt: stamp, updatedAt: stamp })
}
async function makeInvitation() {
  return insert('Invitations', { ownerId: owner, email: `worker-${runId}@test.invalid`, tokenHash: createHash('sha256').update(randomUUID()).digest('hex'), issuedAt: stamp, expiresAt: '2026-10-20 12:00:00.000', createdAt: stamp, updatedAt: stamp })
}
beforeAll(async () => {
  loadTestEnvironment()
  db = createTestDatabase()
  await migrateDatabase(db); await assertSchemaReady(db)
  models = registerModels(db); access = createAccessService(db)
  owner = await account('owner', 'owner'); otherOwner = await account('owner', 'other'); worker = await account('worker', 'worker')
  farm = await createFarm(owner, 'Campo de prueba'); otherFarm = await createFarm(otherOwner, 'Otro campo')
  await insert('Assignments', { farmId: farm, workerId: worker, createdAt: stamp, updatedAt: stamp })
  trough = await insert('Troughs', { farmId: farm, name: 'Bebedero de prueba', capacityLiters: 1000, createdAt: stamp, updatedAt: stamp })
  invitation = await makeInvitation()
}, 30000)
afterAll(async () => { await db?.close() })

it('migraciones repetibles conservan filas y las tres versiones', async () => {
  expect(await migrateDatabase(db)).toEqual([])
  const [rows] = await db.query('SELECT name FROM SchemaMigrations ORDER BY name')
  expect(rows.map((row) => row.name)).toEqual(versions)
  expect((await access.account(owner)).id).toBe(owner)
})
it('esquema completo crea 23 tablas de dominio y claves sin cascadas destructivas', async () => {
  const [tables] = await db.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()')
  expect(tables).toHaveLength(24)
  const [foreignKeys] = await db.query('SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE()')
  expect(foreignKeys.every((row) => row.DELETE_RULE === 'RESTRICT')).toBe(true)
})
it('correo único y roles incompatibles se rechazan en MySQL', async () => {
  await expect(insert('Accounts', { name: 'Duplicado', email: `OWNER-${runId}@test.invalid`, passwordHash: 'test', role: 'owner', createdAt: stamp, updatedAt: stamp })).rejects.toThrow()
  await expect(createFarm(worker, 'No permitido')).rejects.toThrow()
  await expect(insert('Assignments', { farmId: farm, workerId: owner, createdAt: stamp, updatedAt: stamp })).rejects.toThrow()
  await expect(insert('Assignments', { farmId: farm, workerId: worker, createdAt: stamp, updatedAt: stamp })).rejects.toThrow()
})
it('invitar a un campo ajeno y vencimiento diferente de siete días se rechazan', async () => {
  await expect(insert('InvitationFarms', { invitationId: invitation, farmId: otherFarm, ownerId: owner })).rejects.toThrow()
  await expect(insert('Invitations', { ownerId: owner, email: 'test@test.invalid', tokenHash: createHash('sha256').update(randomUUID()).digest('hex'), issuedAt: stamp, expiresAt: '2026-10-21 12:00:00.000', createdAt: stamp, updatedAt: stamp })).rejects.toThrow()
})
it('permisos usan rol SQL, aislamiento y revocación vigente', async () => {
  expect((await access.farm({ id: owner, role: 'worker' }, farm)).id).toBe(farm)
  await expect(access.farm({ id: otherOwner, role: 'owner' }, farm)).rejects.toMatchObject({ status: 404 })
  expect((await access.resource({ id: worker }, 'trough', trough)).id).toBe(trough)
  await db.query('UPDATE Assignments SET active = FALSE WHERE farmId = :farm AND workerId = :worker', { replacements: { farm, worker } })
  await expect(access.farm({ id: worker }, farm)).rejects.toMatchObject({ status: 404 })
  await db.query('UPDATE Assignments SET active = TRUE WHERE farmId = :farm AND workerId = :worker', { replacements: { farm, worker } })
})
it('historial de campos retirados solo se permite al dueño', async () => {
  const retired = await createFarm(owner, 'Retirado')
  await insert('Assignments', { farmId: retired, workerId: worker, createdAt: stamp, updatedAt: stamp })
  await db.query('UPDATE Farms SET deletedAt = :now WHERE id = :id', { replacements: { id: retired, now } })
  await expect(access.farm({ id: owner }, retired)).rejects.toMatchObject({ status: 404 })
  expect((await access.farm({ id: owner }, retired, { includeRetired: true })).id).toBe(retired)
  await expect(access.farm({ id: worker }, retired, { includeRetired: true })).rejects.toMatchObject({ status: 404 })
})
it('lecturas iguales legítimas tienen clave única y valores inmutables', async () => {
  const reading = { sourceKey: `${runId}-1`, troughId: trough, percentage: 20, measuredAt: stamp, receivedAt: stamp }
  const id = await insert('WaterReadings', reading)
  await insert('WaterReadings', { ...reading, sourceKey: `${runId}-2` })
  await expect(insert('WaterReadings', reading)).rejects.toThrow()
  await expect(db.query('UPDATE WaterReadings SET percentage = 99 WHERE id = :id', { replacements: { id } })).rejects.toThrow()
  await db.query("UPDATE WaterReadings SET processedAt = :now, processingResult = 'valid' WHERE id = :id", { replacements: { id, now } })
  await expect(db.query('DELETE FROM WaterReadings WHERE id = :id', { replacements: { id } })).rejects.toThrow()
  await expect(insert('WaterReadings', { ...reading, sourceKey: `${runId}-invalid`, percentage: 101 })).rejects.toThrow()
})
it('visitas exigen el mismo campo y una única entrada por posición', async () => {
  const animal = await insert('Animals', { farmId: farm, name: 'Animal de prueba', species: 'Bovino', breed: 'Prueba', ageYears: 2, state: 'Activo', createdAt: stamp, updatedAt: stamp })
  const position = await insert('AnimalPositions', { animalId: animal, sourceKey: `${runId}-animal`, latitude: -26, longitude: -59, measuredAt: stamp, receivedAt: stamp })
  const foreignTrough = await insert('Troughs', { farmId: otherFarm, name: 'Ajeno', capacityLiters: 100, createdAt: stamp, updatedAt: stamp })
  const visit = { farmId: farm, animalId: animal, troughId: trough, positionId: position, visitedAt: stamp }
  await expect(insert('EstimatedVisits', { ...visit, troughId: foreignTrough })).rejects.toThrow()
  await insert('EstimatedVisits', visit)
  await expect(insert('EstimatedVisits', visit)).rejects.toThrow()
  await insert('AnimalStates', { animalId: animal, lastPositionId: position, troughInRangeId: trough })
  await expect(insert('AnimalStates', { animalId: animal })).rejects.toThrow()
})
it('peón compartido acumula campos pero solo ve sus propias tareas', async () => {
  const colleague = await account('worker', 'colleague')
  await insert('Assignments', { farmId: farm, workerId: colleague, createdAt: stamp, updatedAt: stamp })
  await insert('Assignments', { farmId: otherFarm, workerId: worker, createdAt: stamp, updatedAt: stamp })
  expect(await access.farmIds({ id: worker })).toEqual([farm, otherFarm])
  const task = await insert('Tasks', { farmId: farm, workerId: colleague, title: 'Prueba', description: 'Tarea de prueba', deadline: stamp, createdAt: stamp, updatedAt: stamp })
  await expect(access.resource({ id: worker }, 'task', task)).rejects.toMatchObject({ status: 404 })
  expect((await access.resource({ id: colleague }, 'task', task)).id).toBe(task)
  expect((await access.resource({ id: owner }, 'task', task)).id).toBe(task)
})
it('historial es atómico, admite actor nulo y rechaza cambios y secretos', async () => {
  const event = { farmId: farm, resourceId: trough, type: 'water', actorId: null, occurredAt: now, details: { percentage: 20 } }
  let rolledBack
  await expect(db.transaction(async (transaction) => {
    rolledBack = (await writeHistory(db, event, { transaction })).id
    throw new Error('rollback de prueba')
  })).rejects.toThrow('rollback de prueba')
  expect(await models.HistoryEvent.findByPk(rolledBack)).toBeNull()
  const saved = await db.transaction((transaction) => writeHistory(db, event, { transaction }))
  expect(saved.actorId).toBeNull()
  await expect(saved.update({ details: { percentage: 50 } })).rejects.toThrow(/inmutables/)
  await expect(db.query('DELETE FROM HistoryEvents WHERE id = :id', { replacements: { id: saved.id } })).rejects.toThrow()
  await expect(db.transaction((transaction) => writeHistory(db, { ...event, details: { token: 'secret' } }, { transaction }))).rejects.toMatchObject({ code: 'UNSAFE_HISTORY' })
})

describe('cola durable con SMTP simulado', () => {
  let mail
  beforeAll(() => { mail = createMailService(db, { secret, clock }) })
  it('envía una vez en concurrencia, persiste y retira payload', async () => {
    const item = await db.transaction((transaction) => mail.enqueue({ kind: 'invitation', invitationId: invitation, payload: { text: 'Enlace ?token=test-only' } }, { transaction }))
    expect(item.encryptedPayload).not.toContain('test-only')
    const transport = { sendMail: vi.fn().mockResolvedValue({ accepted: [item.recipient] }) }
    const processor = createMailWorker(db, { mail, transport, from: 'test@test.invalid', clock })
    await Promise.all([processor.processNext(), processor.processNext()])
    expect(transport.sendMail).toHaveBeenCalledTimes(1)
    await item.reload()
    expect(item.state).toBe('sent'); expect(item.encryptedPayload).toBeNull()
  })
  it('reintenta 1/2/4 minutos y termina tras tres reintentos', async () => {
    now = new Date('2026-10-13T12:00:00Z')
    const invitationId = await makeInvitation()
    const item = await db.transaction((transaction) => mail.enqueue({ kind: 'invitation', invitationId, payload: { text: 'Test' } }, { transaction }))
    const transport = { sendMail: vi.fn().mockRejectedValue(new Error('SMTP secret that must not persist')) }
    let processor = createMailWorker(db, { mail, transport, from: 'test@test.invalid', clock })
    for (const [index, delay] of [60000, 120000, 240000].entries()) {
      await processor.processNext(); await item.reload()
      expect(item.attempts).toBe(index + 1)
      expect(item.nextAttemptAt.getTime() - now.getTime()).toBe(delay)
      expect((await processor.processNext()).processed).toBe(false)
      now = new Date(now.getTime() + delay)
      // Un procesador nuevo retoma lo persistido, no necesita cola en memoria.
      processor = createMailWorker(db, { mail, transport, from: 'test@test.invalid', clock })
    }
    await processor.processNext(); await item.reload()
    expect(item.state).toBe('failed'); expect(item.attempts).toBe(4)
    expect(item.errorCode).toBe('SMTP_FAILED')
    expect(transport.sendMail).toHaveBeenCalledTimes(4)
    now = new Date('2026-10-20T12:00:00Z')
    await processor.expire(); await item.reload()
    expect(item.encryptedPayload).toBeNull(); expect(item.state).toBe('expired')
  })
  it('vence exactamente al plazo sin SMTP ni payload recuperable', async () => {
    now = new Date('2026-10-13T12:00:00Z')
    const item = await db.transaction(async (transaction) => mail.enqueue({ kind: 'invitation', invitationId: await makeInvitation(), payload: { text: 'Test' } }, { transaction }))
    const transport = { sendMail: vi.fn() }
    now = new Date('2026-10-20T12:00:00Z')
    await createMailWorker(db, { mail, transport, from: 'test@test.invalid', clock }).processNext()
    await item.reload()
    expect(transport.sendMail).not.toHaveBeenCalled(); expect(item.encryptedPayload).toBeNull()
  })
})
it('salud persiste sin secretos y conserva el último éxito al fallar', async () => {
  now = new Date('2026-10-13T12:00:00Z')
  const health = createWorkerHealth(db, { name: `test-${runId}`, clock })
  await health.record(12)
  now = new Date(now.getTime() + 5000)
  await health.record(20, 'arbitrary secret SQL')
  const state = await createWorkerHealth(db, { name: `test-${runId}`, clock }).read()
  expect(state.errorCode).toBe('JOB_FAILED')
  expect(state.lastSuccessfulCycleAt.toISOString()).toBe('2026-10-13T12:00:00.000Z')
})
it('API arranca sin migrar/sincronizar y worker admite una sola instancia y cierre limpio', async () => {
  const env = {
    DB_NAME: process.env.TEST_DB_NAME, DB_HOST: process.env.TEST_DB_HOST, DB_PORT: Number(process.env.TEST_DB_PORT),
    DB_USER: process.env.TEST_DB_USER, DB_PASSWORD: process.env.TEST_DB_PASSWORD,
    OUTBOX_SECRET: secret, PORT: 0, TRUST_PROXY: 0,
  }
  const server = await startServer({ env })
  try {
    const response = await fetch(`http://127.0.0.1:${server.server.address().port}/api/user/create`, { method: 'POST' })
    expect(response.status).toBe(404)
    expect((await access.account(owner)).id).toBe(owner)
  } finally { await server.close() }
  const first = await startWorker({ env })
  try { await expect(startWorker({ env })).rejects.toThrow(/worker activo/) }
  finally { await first.close() }
  const second = await startWorker({ env })
  await second.close()
})
