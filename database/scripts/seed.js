import bcrypt from 'bcrypt'
import { pathToFileURL } from 'node:url'
import { loadEnv } from '../config/loadEnv.js'
import { createDatabase } from '../db/database.js'
import { assertSchemaReady } from './migrate.js'
import { submitSample } from './sample.js'
import { select, insert, sqlValues } from '../services/monitoringSql.service.js'
import { pilotAccounts, pilotPlan, pilotWaterLevel } from '../tests/fixtures/pilot.js'

// Seed idempotente del piloto. Solo desarrollo/pruebas: nunca se ejecuta al arrancar
// la API ni el worker, y se rechaza en producción. Repetirlo no duplica filas.
export async function seedPilot(db, { environment = process.env.NODE_ENV, password, samples = true, now = new Date() } = {}) {
  if (!['development', 'test'].includes(environment)) throw new Error('El seed del piloto solo se permite en desarrollo o pruebas')
  if (typeof password !== 'string' || password.length < 10) throw new Error('DEMO_PASSWORD es obligatorio (mínimo 10 caracteres)')
  const summary = { accounts: 0, farms: 0, troughs: 0, animals: 0, assignments: 0 }
  const ids = {}
  for (const account of pilotAccounts) {
    const [existing] = await select(db, 'SELECT id, role FROM Accounts WHERE email=:email', { email: account.email })
    if (existing) {
      if (existing.role !== account.role) throw new Error('Una cuenta del piloto existe con otro rol; revisar la base')
      ids[account.key] = Number(existing.id)
      continue
    }
    ids[account.key] = await insert(db, 'Accounts', {
      name: account.name, email: account.email, role: account.role, passwordHash: await bcrypt.hash(password, 12),
      emailVerifiedAt: now, createdAt: now, updatedAt: now,
    })
    summary.accounts += 1
  }
  const plan = pilotPlan()
  for (const [f, item] of plan.entries()) {
    await db.transaction(async (transaction) => {
      const ownerId = ids[item.owner]
      let [farm] = await select(db, 'SELECT id FROM Farms WHERE ownerId=:ownerId AND name=:name AND deletedAt IS NULL', { ownerId, name: item.farm.name }, transaction)
      if (!farm) {
        farm = { id: await insert(db, 'Farms', { ...item.farm, ownerId, createdAt: now, updatedAt: now }, transaction) }
        summary.farms += 1
      }
      const farmId = Number(farm.id)
      item.farmId = farmId
      for (const [kind, table, stateTable, stateKey] of [['troughs', 'Troughs', 'TroughStates', 'troughId'], ['animals', 'Animals', 'AnimalStates', 'animalId']]) {
        const existing = new Set((await select(db, `SELECT name FROM ${table} WHERE farmId=:farmId AND deletedAt IS NULL`, { farmId }, transaction)).map((r) => r.name))
        for (const resource of item[kind].filter((r) => !existing.has(r.name))) {
          const id = await insert(db, table, { ...resource, farmId, createdAt: now, updatedAt: now }, transaction)
          await insert(db, stateTable, { [stateKey]: id }, transaction)
          summary[kind] += 1
        }
      }
      if (item.sharedWithWorker) {
        const [assignment] = await select(db, 'SELECT id FROM Assignments WHERE farmId=:farmId AND workerId=:workerId', { farmId, workerId: ids.worker }, transaction)
        // No reactiva asignaciones revocadas manualmente: solo crea la inicial.
        if (!assignment) {
          await db.query('INSERT INTO Assignments (farmId, workerId, createdAt, updatedAt) VALUES (:farmId, :workerId, :now, :now)', { replacements: sqlValues({ farmId, workerId: ids.worker, now }), transaction })
          summary.assignments += 1
        }
      }
    })
    if (!samples) continue
    // Muestras iniciales con clave de fuente fija: las ya enviadas no se repiten.
    const sent = new Set((await select(db, `SELECT w.sourceKey FROM WaterReadings w JOIN Troughs t ON t.id=w.troughId WHERE t.farmId=:farmId AND w.sourceKey LIKE 'pilot:%'
      UNION ALL SELECT p.sourceKey FROM AnimalPositions p JOIN Animals a ON a.id=p.animalId WHERE a.farmId=:farmId AND p.sourceKey LIKE 'pilot:%'`, { farmId: item.farmId })).map((r) => r.sourceKey))
    const troughs = await select(db, 'SELECT id, name, latitude, longitude FROM Troughs WHERE farmId=:farmId AND deletedAt IS NULL ORDER BY name', { farmId: item.farmId })
    for (const [t, trough] of troughs.entries()) {
      if (!sent.has(`pilot:water:${trough.id}:0`)) await submitSample(db, 'water', { resourceId: Number(trough.id), sourceKey: `pilot:water:${trough.id}:0`, percentage: pilotWaterLevel(f, t), measuredAt: now.toISOString() }, { environment, now })
    }
    const animals = await select(db, 'SELECT id, name FROM Animals WHERE farmId=:farmId AND deletedAt IS NULL ORDER BY name', { farmId: item.farmId })
    for (const [a, animal] of animals.entries()) {
      // Posiciones alejadas de los bebederos para no fabricar visitas estimadas.
      const latitude = Math.round((item.farm.latitude + 0.02 + (a % 10) * 0.001) * 1e6) / 1e6
      const longitude = Math.round((item.farm.longitude + 0.02 + Math.floor(a / 10) * 0.001) * 1e6) / 1e6
      if (!sent.has(`pilot:gps:${animal.id}:0`)) await submitSample(db, 'animalPosition', { resourceId: Number(animal.id), sourceKey: `pilot:gps:${animal.id}:0`, latitude, longitude, measuredAt: now.toISOString() }, { environment, now })
    }
  }
  return { ids, summary, farmIds: plan.map((item) => item.farmId) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = loadEnv()
  const db = createDatabase(env)
  db.authenticate()
    .then(() => assertSchemaReady(db))
    .then(() => seedPilot(db, { environment: env.NODE_ENV, password: env.DEMO_PASSWORD, samples: !process.argv.includes('--no-samples') }))
    .then(({ summary }) => {
      console.log(`Seed del piloto aplicado. Nuevos: ${JSON.stringify(summary)}. El worker procesa las muestras.`)
    })
    .catch((error) => {
      console.error(`No se aplicó el seed: ${error.message.startsWith('El seed') || error.message.startsWith('DEMO_PASSWORD') || error.message.startsWith('Una cuenta') ? error.message : error.name}`)
      process.exitCode = 1
    })
    .finally(() => db.close())
}
