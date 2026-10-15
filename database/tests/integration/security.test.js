import request from 'supertest'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { openIdentityDatabase, buildIdentityApp } from '../helpers/identityFixtures.js'
import { monitoringContext, farmBody, troughBody, animalBody, write, fixtureInsert } from '../helpers/monitoringFixtures.js'
import { submitSample } from '../../scripts/sample.js'
import { createWaterProcessing } from '../../services/waterProcessing.service.js'
import { createPositionProcessing } from '../../services/positionProcessing.service.js'
import { createHealthRouter } from '../../router/health.router.js'
import { createApp } from '../../app.js'

// SC-002: dos dueños y un peón con asignaciones cruzadas. Todo acceso fuera de alcance,
// rol incompatible o escritura de telemetría se rechaza sin revelar ni alterar datos.
let db, c, fA, fB, tA, aA, tB, taskB
const SECRET_FIELDS = /passwordHash|tokenHash|encryptedPayload|"password"/

beforeAll(async () => {
  db = await openIdentityDatabase()
  c = await monitoringContext(db)
  fA = (await write(c.owner, 'post', '/farms', farmBody)).body
  fB = (await write(c.other, 'post', '/farms', { ...farmBody, name: 'Campo dueño B' })).body
  for (const farm of [fA, fB]) await fixtureInsert(db, 'Assignments', { farmId: farm.id, workerId: c.worker.account.id, createdAt: c.clock.now(), updatedAt: c.clock.now() })
  tA = (await write(c.owner, 'post', `/farms/${fA.id}/troughs`, troughBody)).body
  aA = (await write(c.owner, 'post', `/farms/${fA.id}/animals`, animalBody)).body
  tB = (await write(c.other, 'post', `/farms/${fB.id}/troughs`, troughBody)).body
  taskB = (await write(c.other, 'post', `/farms/${fB.id}/tasks`, { title: 'Tarea B', description: 'x', deadline: c.clock.now().toISOString(), workerId: c.worker.account.id })).body
  await submitSample(db, 'water', { resourceId: tA.id, sourceKey: `sec:${tA.id}`, percentage: 40, measuredAt: c.clock.now().toISOString() }, { environment: 'test' })
  await submitSample(db, 'animalPosition', { resourceId: aA.id, sourceKey: `sec:${aA.id}`, latitude: -26, longitude: -59, measuredAt: c.clock.now().toISOString() }, { environment: 'test' })
  await createWaterProcessing(db, { clock: c.clock }).process(); await createPositionProcessing(db, { clock: c.clock }).process()
}, 30000)
afterAll(async () => { c?.identity.close(); await db?.close() })

it('rutas legacy deshabilitadas y desconocidas responden JSON 404 sin HTML', async () => {
  for (const path of ['/api/user', '/api/perfil', '/api/bebederos', '/api/user/1']) {
    const res = await request(c.app).get(path).expect(404)
    expect(res.body).toEqual({ code: 'NOT_FOUND', message: 'Recurso no encontrado.' })
  }
  // Bajo /api/v1 se exige sesión antes de resolver rutas: sin sesión 401, con sesión 404.
  expect((await request(c.app).get('/api/v1/no-existe').expect(401)).body.code).toBe('UNAUTHENTICATED')
  expect((await c.owner.agent.get('/api/v1/no-existe').expect(404)).body.code).toBe('NOT_FOUND')
})

it('aislamiento cruzado: el dueño A no ve recursos de B aunque compartan peón (404 sin revelar)', async () => {
  for (const path of [`/farms/${fB.id}`, `/troughs/${tB.id}`, `/tasks/${taskB.id}`, `/farms/${fB.id}/weather`, `/troughs/${tB.id}/history`, `/dashboard?farmId=${fB.id}`, `/history?farmId=${fB.id}`, `/troughs?farmId=${fB.id}`, `/map?farmId=${fB.id}`]) {
    const res = await c.owner.agent.get(`/api/v1${path}`)
    expect([404]).toContain(res.status)
    expect(JSON.stringify(res.body)).not.toContain('Campo dueño B')
  }
  const team = (await c.owner.agent.get('/api/v1/team').expect(200)).body
  expect(JSON.stringify(team)).not.toContain(String(fB.id) + ',')
  // El peón compartido ve ambos campos, pero solo sus tareas.
  expect((await c.worker.agent.get('/api/v1/farms').expect(200)).body.total).toBe(2)
  expect((await c.worker.agent.get(`/api/v1/tasks?farmId=${fB.id}`).expect(200)).body.items.map((t) => t.id)).toEqual([taskB.id])
})

it('rol incompatible: el peón no administra; 403 sin modificar datos', async () => {
  await write(c.worker, 'post', '/farms', farmBody).expect(403)
  await write(c.worker, 'post', `/farms/${fA.id}/troughs`, troughBody).expect(403)
  await write(c.worker, 'delete', `/troughs/${tA.id}`).expect(403)
  await write(c.worker, 'patch', `/animals/${aA.id}`, { name: 'Cambiado' }).expect(403)
  await write(c.worker, 'post', '/invitations', { email: 'x@test.invalid', farmIds: [fA.id] }).expect(403)
  expect((await c.owner.agent.get(`/api/v1/animals/${aA.id}`).expect(200)).body.name).toBe(animalBody.name)
})

it('payload desconocido y telemetría manual rechazados; nivel/GPS inmutables también en SQL', async () => {
  await write(c.owner, 'post', `/farms/${fA.id}/troughs`, { ...troughBody, waterLevel: 99 }).expect(422)
  await write(c.owner, 'post', `/farms/${fA.id}/animals`, { ...animalBody, position: { latitude: 1, longitude: 1 } }).expect(422)
  await write(c.owner, 'patch', `/animals/${aA.id}`, { lastVisit: null }).expect(422)
  await write(c.owner, 'patch', `/farms/${fA.id}`, { ownerId: c.other.account.id }).expect(422)
  for (const method of ['patch', 'put', 'post']) expect([404, 405]).toContain((await write(c.owner, method, `/troughs/${tA.id}`, { waterLevel: 1 })).status)
  await expect(db.query('UPDATE WaterReadings SET percentage=99 WHERE sourceKey=:k', { replacements: { k: `sec:${tA.id}` } })).rejects.toThrow()
  await expect(db.query('UPDATE AnimalPositions SET latitude=1 WHERE sourceKey=:k', { replacements: { k: `sec:${aA.id}` } })).rejects.toThrow()
  const trough = (await c.owner.agent.get(`/api/v1/troughs/${tA.id}`).expect(200)).body
  expect(trough).toMatchObject({ waterLevel: 40, waterCategory: 'Bajo' })
  expect((await c.owner.agent.get(`/api/v1/animals/${aA.id}`).expect(200)).body.position).toMatchObject({ latitude: -26, longitude: -59 })
})

it('serializers sin secretos en respuestas de cuenta, equipo, invitaciones y recursos', async () => {
  for (const path of ['/auth/me', '/team', '/invitations', '/farms', '/troughs', '/animals', '/tasks', '/alerts', '/notifications', '/history', '/dashboard', `/troughs/${tA.id}`]) {
    const res = await c.owner.agent.get(`/api/v1${path}`).expect(200)
    expect(JSON.stringify(res.body)).not.toMatch(SECRET_FIELDS)
  }
  expect(Object.keys((await c.owner.agent.get('/api/v1/auth/me')).body.account).sort()).toEqual(['email', 'id', 'name', 'role'])
  expect(SECRET_FIELDS.test(JSON.stringify((await c.worker.agent.get('/api/v1/farms')).body))).toBe(false)
})

it('CSRF obligatorio en escrituras; cookie HttpOnly y SameSite=Lax; sin sesión 401', async () => {
  const noCsrf = await c.owner.agent.post('/api/v1/farms').send(farmBody)
  expect(noCsrf.status).toBe(403); expect(noCsrf.body.code).toBe('CSRF_INVALID')
  await c.owner.agent.post('/api/v1/farms').set('X-CSRF-Token', c.other.csrf).send(farmBody).expect(403)
  await request(c.app).get('/api/v1/farms').expect(401)
  const csrf = await request(c.app).get('/api/v1/auth/csrf').expect(200)
  const cookie = csrf.headers['set-cookie'].join(';')
  expect(cookie).toMatch(/bebederos\.sid=/); expect(cookie).toMatch(/HttpOnly/i); expect(cookie).toMatch(/SameSite=Lax/i)
  expect(csrf.headers['cache-control']).toBe('no-store')
  expect(csrf.headers['x-powered-by']).toBeUndefined()
  expect(csrf.headers['x-content-type-options']).toBe('nosniff')
})

it('límites de solicitudes: 429 JSON al superar general e identidad', async () => {
  const { app, identity } = buildIdentityApp(db, { limits: { generalPerMinute: 3, identityPer15Minutes: 100 } })
  try {
    for (let i = 0; i < 3; i += 1) await request(app).get('/api/v1/auth/csrf').expect(200)
    const limited = await request(app).get('/api/v1/auth/csrf').expect(429)
    expect(limited.body.code).toBe('RATE_LIMITED')
  } finally { identity.close() }
  const strict = buildIdentityApp(db, { limits: { generalPerMinute: 1000, identityPer15Minutes: 2 } })
  try {
    const agent = request.agent(strict.app)
    const { csrfToken } = (await agent.get('/api/v1/auth/csrf')).body
    const statuses = []
    for (let i = 0; i < 3; i += 1) statuses.push((await agent.post('/api/v1/auth/login').set('X-CSRF-Token', csrfToken).send({ email: 'nadie@test.invalid', password: 'clave-incorrecta-1' })).status)
    expect(statuses.at(-1)).toBe(429)
  } finally { strict.identity.close() }
})

it('salud pública mínima: sin secretos ni datos del worker', async () => {
  const app = createApp({ configure(app) { app.use('/api/v1/health', createHealthRouter({ db })) } })
  const res = await request(app).get('/api/v1/health').expect(200)
  expect(Object.keys(res.body).sort()).toEqual(['database', 'status', 'time'])
  const down = createApp({ configure(app) { app.use('/api/v1/health', createHealthRouter({ db: { query: async () => { throw new Error('ECONNREFUSED 127.0.0.1 password') } } })) } })
  const failed = await request(down).get('/api/v1/health').expect(503)
  expect(JSON.stringify(failed.body)).not.toMatch(/ECONN|password/)
})

it('revocación: el peón pierde acceso inmediato a todo recurso del dueño B', async () => {
  await write(c.other, 'put', `/team/${c.worker.account.id}/assignments`, { farmIds: [] }).expect(200)
  for (const path of [`/farms/${fB.id}`, `/troughs/${tB.id}`, `/tasks/${taskB.id}`, `/troughs/${tB.id}/history`, `/dashboard?farmId=${fB.id}`])
    expect((await c.worker.agent.get(`/api/v1${path}`)).status).toBe(404)
  await write(c.worker, 'post', `/tasks/${taskB.id}/actions`, { action: 'start', expectedVersion: 1 }).expect(404)
  expect((await c.worker.agent.get('/api/v1/farms').expect(200)).body.items.map((f) => f.id)).toEqual([fA.id])
})
