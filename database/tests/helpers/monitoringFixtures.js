import { sqlValues } from '../../services/monitoringSql.service.js'
import request from 'supertest'
import { buildIdentityApp, insertAccount, email, loginAgent } from './identityFixtures.js'
import { installMonitoringApi } from '../../router/monitoring.router.js'
export const farmBody = {
  name: 'Campo Norte',
  latitude: -26,
  longitude: -59,
  areaHa: 10,
  description: '',
  staleMinutes: 180,
  timezone: 'America/Argentina/Buenos_Aires',
}
export const troughBody = {
  name: 'B1',
  capacityLiters: 500,
  operationalState: 'Operativo',
  latitude: -26,
  longitude: -59,
}
export const animalBody = {
  name: 'A1',
  species: 'Bovino',
  breed: 'Angus',
  ageYears: 2,
  state: 'Activo',
}
export async function monitoringContext(db) {
  const ctx = buildIdentityApp(db)
  // Install before the terminal 404/error middleware.
  const { createApp } = await import('../../app.js')
  ctx.app = createApp({
    configure(app) {
      ctx.identity.install(app)
      installMonitoringApi(app, { db, clock: ctx.clock, mail:ctx.mail, appUrl:'http://localhost:5173' })
    },
  })
  const sessions = {}
  for (const role of ['owner', 'other', 'worker']) {
    const address = email(`monitor-${role}-${Math.random().toString(36).slice(2)}`)
    await insertAccount(db, { name: role, address, role: role === 'worker' ? 'worker' : 'owner' })
    sessions[role] = await loginAgent(request, ctx.app, address)
  }
  return { ...ctx, ...sessions }
}
export function write(session, method, path, body) {
  return session.agent[method](`/api/v1${path}`).set('X-CSRF-Token', session.csrf).send(body)
}
export async function fixtureInsert(db, table, values) {
  const keys = Object.keys(values)
  const [id] = await db.query(
    `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``)}) VALUES (${keys.map((k) => `:${k}`)})`,
    { replacements: sqlValues(values) },
  )
  return id
}
