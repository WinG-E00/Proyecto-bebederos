import bcrypt from 'bcrypt'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadEnv } from '../config/loadEnv.js'
import { createDatabase } from '../db/database.js'
import { assertSchemaReady } from './migrate.js'
import { seedPilot } from './seed.js'
import { submitSample } from './sample.js'
import { select, sqlValues } from '../services/monitoringSql.service.js'
import { PILOT_DOMAIN } from '../tests/fixtures/pilot.js'

// Carga piloto (SC-003): 20 usuarios concurrentes consultan como la interfaz (cada vista cada 10 s)
// mientras llegan muestras de agua y GPS. Mide latencia HTTP, cambios visibles ≤30 s, retiro de una
// asignación revocada, atraso del worker y duplicados. Solo desarrollo/pruebas: crea cuentas de carga.
// Uso: API en LOAD_BASE_URL (por defecto http://127.0.0.1:3000/api/v1) y DEMO_PASSWORD definido.
//   npm run load:pilot --prefix database -- --minutes=3 [--no-worker]
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]))
const MINUTES = Number(args.minutes ?? 3)
const USERS = 20
const POLL_MS = 10000
const VIEWS = ['troughs', 'map', 'dashboard', 'alerts']
const LIMIT_MS = 30000

const percentile = (values, p) => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  return Math.round(sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)])
}
const stats = (values) => ({ n: values.length, p50: percentile(values, 50), p95: percentile(values, 95), p99: percentile(values, 99), max: values.length ? Math.round(Math.max(...values)) : null })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function client(base) {
  let cookie = ''
  let csrf = ''
  async function call(method, path, body) {
    const headers = { ...(cookie && { Cookie: cookie }), ...(body && { 'Content-Type': 'application/json' }), ...(method !== 'GET' && { 'X-CSRF-Token': csrf }) }
    const res = await fetch(base + path, { method, headers, body: body && JSON.stringify(body) })
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]
    const text = await res.text()
    return { status: res.status, body: text ? JSON.parse(text) : null }
  }
  return {
    call,
    async login(email, password) {
      csrf = (await call('GET', '/auth/csrf')).body.csrfToken
      const res = await call('POST', '/auth/login', { email, password })
      if (res.status !== 200) throw new Error(`Login de carga rechazado (${res.status})`)
      csrf = res.body.csrfToken
      return res.body.account
    },
  }
}

// 17 peones de carga además de los 2 dueños y el peón compartido del piloto. Idempotente.
async function prepareUsers(db, password, farmIds) {
  const hash = await bcrypt.hash(password, 10)
  const now = new Date()
  const users = []
  for (let i = 1; i <= USERS - 3; i += 1) {
    const email = `carga-${String(i).padStart(2, '0')}@${PILOT_DOMAIN}`
    let [row] = await select(db, 'SELECT id FROM Accounts WHERE email=:email', { email })
    if (!row) {
      await db.query("INSERT INTO Accounts (name,email,passwordHash,role,emailVerifiedAt,createdAt,updatedAt) VALUES (:name,:email,:hash,'worker',:now,:now,:now)", { replacements: sqlValues({ name: `Peón carga ${i}`, email, hash, now }) })
      ;[row] = await select(db, 'SELECT id FROM Accounts WHERE email=:email', { email })
    }
    const farmId = farmIds[(i - 1) % farmIds.length]
    // Reactiva solo asignaciones de cuentas de carga (pueden quedar revocadas por una ejecución previa).
    await db.query('INSERT INTO Assignments (farmId,workerId,createdAt,updatedAt) VALUES (:farmId,:id,:now,:now) ON DUPLICATE KEY UPDATE active=TRUE, revokedAt=NULL, updatedAt=:now', { replacements: sqlValues({ farmId, id: Number(row.id), now }) })
    users.push({ email, id: Number(row.id), farmId })
  }
  return users
}

export async function runLoad({ db, base, password, minutes = MINUTES, environment, log = console.log }) {
  if (!['development', 'test'].includes(environment)) throw new Error('La carga piloto solo se permite en desarrollo o pruebas')
  const { ids, farmIds } = await seedPilot(db, { environment, password, samples: true })
  const loadUsers = await prepareUsers(db, password, farmIds)
  const sessions = [
    { email: `duenio-a@${PILOT_DOMAIN}`, role: 'owner' }, { email: `duenio-b@${PILOT_DOMAIN}`, role: 'owner' }, { email: `peon@${PILOT_DOMAIN}`, role: 'worker' },
    ...loadUsers.map((u) => ({ ...u, role: 'worker' })),
  ]
  for (const s of sessions) { s.client = client(base); s.account = await s.client.login(s.email, password) }
  const owners = { A: sessions[0], B: sessions[1] }
  const troughs = await select(db, 'SELECT t.id, t.farmId FROM Troughs t WHERE t.farmId IN (:farmIds) AND t.deletedAt IS NULL', { farmIds })
  const animals = await select(db, 'SELECT a.id, a.farmId FROM Animals a WHERE a.farmId IN (:farmIds) AND a.deletedAt IS NULL', { farmIds })
  const farmOwner = Object.fromEntries((await select(db, 'SELECT id, ownerId FROM Farms WHERE id IN (:farmIds)', { farmIds })).map((f) => [f.id, f.ownerId]))
  const visible = (s, farmId) => s.role === 'owner' ? farmOwner[farmId] === s.account.id : s.farms?.has(farmId)
  for (const s of sessions) if (s.role === 'worker') s.farms = new Set((await select(db, 'SELECT farmId FROM Assignments WHERE workerId=:id AND active=TRUE', { id: s.account.id })).map((r) => r.farmId))

  const latency = Object.fromEntries(VIEWS.map((v) => [v, []]))
  const statuses = {}
  const changes = new Map() // key -> {kind, resourceId, farmId, value, submittedAt, seen: Map(userIndex -> ms), superseded}
  const latestByResource = new Map()
  const revocation = { user: null, farmId: null, revokedAt: null, removedAfterMs: null, deniedWrites: null }
  const end = Date.now() + minutes * 60000
  let running = true
  const tag = Date.now().toString(36)

  async function poll(s, index) {
    const offset = Math.floor((index / sessions.length) * (POLL_MS / VIEWS.length))
    await sleep(offset)
    let view = index % VIEWS.length
    while (running) {
      const name = VIEWS[view]
      const path = { troughs: '/troughs?limit=100', map: '/map', dashboard: '/dashboard', alerts: '/alerts' }[name]
      const started = performance.now()
      let res
      try { res = await s.client.call('GET', path) } catch { res = { status: 'network', body: null } }
      const at = Date.now()
      latency[name].push(performance.now() - started)
      statuses[res.status] = (statuses[res.status] ?? 0) + 1
      if (res.status === 200 && name === 'troughs') {
        const items = res.body.items
        for (const t of items) {
          const change = latestByResource.get(`water:${t.id}`)
          if (change && !change.seen.has(index) && t.waterLevel === change.value && new Date(t.lastUpdatedAt).getTime() >= change.measuredAt) change.seen.set(index, at - change.submittedAt)
        }
        if (revocation.user === index && revocation.revokedAt && revocation.removedAfterMs == null && !items.some((t) => t.farmId === revocation.farmId)) revocation.removedAfterMs = at - revocation.revokedAt
      }
      if (res.status === 200 && name === 'map') {
        for (const m of res.body) {
          if (m.type !== 'animal') continue
          const change = latestByResource.get(`gps:${m.id}`)
          if (change && !change.seen.has(index) && m.latitude === change.value[0] && m.longitude === change.value[1]) change.seen.set(index, at - change.submittedAt)
        }
      }
      view = (view + 1) % VIEWS.length
      await sleep(POLL_MS / VIEWS.length)
    }
  }

  async function produce() {
    let n = 0
    while (Date.now() < end - LIMIT_MS) {
      n += 1
      const now = new Date()
      if (n % 2) {
        const t = troughs[Math.floor(Math.random() * troughs.length)]
        const value = Math.round(Math.random() * 1000) / 10
        await submitSample(db, 'water', { resourceId: Number(t.id), sourceKey: `load:${tag}:w:${n}`, percentage: value, measuredAt: now.toISOString() }, { environment, now })
        const previous = latestByResource.get(`water:${t.id}`)
        if (previous) previous.superseded = true
        const change = { kind: 'water', resourceId: t.id, farmId: t.farmId, value, measuredAt: now.getTime(), submittedAt: Date.now(), seen: new Map() }
        changes.set(`w${n}`, change); latestByResource.set(`water:${t.id}`, change)
      } else {
        const a = animals[Math.floor(Math.random() * animals.length)]
        const value = [Math.round((-26.2 - Math.random() * 0.5) * 1e6) / 1e6, Math.round((-58.97 + Math.random() * 0.5) * 1e6) / 1e6]
        await submitSample(db, 'animalPosition', { resourceId: Number(a.id), sourceKey: `load:${tag}:g:${n}`, latitude: value[0], longitude: value[1], measuredAt: now.toISOString() }, { environment, now })
        const previous = latestByResource.get(`gps:${a.id}`)
        if (previous) previous.superseded = true
        const change = { kind: 'gps', resourceId: a.id, farmId: a.farmId, value, measuredAt: now.getTime(), submittedAt: Date.now(), seen: new Map() }
        changes.set(`g${n}`, change); latestByResource.set(`gps:${a.id}`, change)
      }
      if (!revocation.user && Date.now() > end - (minutes * 60000) / 2) {
        // A mitad de la carga, el dueño A revoca al primer peón de carga de uno de sus campos.
        const index = sessions.findIndex((s, i) => i > 2 && farmOwner[s.farmId] === owners.A.account.id)
        const s = sessions[index]
        revocation.user = index; revocation.farmId = s.farmId; revocation.revokedAt = Date.now()
        const res = await owners.A.client.call('PUT', `/team/${s.account.id}/assignments`, { farmIds: [] })
        if (res.status !== 200) throw new Error(`Revocación rechazada (${res.status})`)
        s.farms = new Set()
        revocation.deniedWrites = (await s.client.call('GET', `/farms/${s.farmId}`)).status
      }
      await sleep(2000)
    }
  }

  log(`Carga: ${sessions.length} usuarios, ${minutes} min, ${troughs.length} bebederos y ${animals.length} animales del piloto.`)
  const pollers = sessions.map((s, i) => poll(s, i))
  await produce()
  await sleep(Math.max(0, end - Date.now()))
  running = false
  await Promise.all(pollers)

  // Pares (cambio, usuario que puede verlo). Excluye cambios reemplazados antes de que alguien los viera.
  const pairs = []
  for (const change of changes.values()) {
    if (change.superseded && !change.seen.size) continue
    sessions.forEach((s, i) => {
      if (i === revocation.user && change.submittedAt >= revocation.revokedAt) return
      if (visible(s, change.farmId) || (s.role === 'worker' && i === revocation.user && change.farmId === revocation.farmId && change.submittedAt < revocation.revokedAt)) {
        if (change.superseded && !change.seen.has(i)) return
        pairs.push({ kind: change.kind, ms: change.seen.get(i) ?? Infinity })
      }
    })
  }
  const within = (list) => list.length ? Math.round((list.filter((p) => p.ms <= LIMIT_MS).length / list.length) * 1000) / 10 : null
  const [lag] = await select(db, `SELECT
    (SELECT COUNT(*) FROM WaterReadings WHERE sourceKey LIKE :like) water, (SELECT COUNT(*) FROM AnimalPositions WHERE sourceKey LIKE :like) gps,
    (SELECT COUNT(*) FROM WaterReadings WHERE sourceKey LIKE :like AND processedAt IS NULL) waterPending,
    (SELECT COUNT(*) FROM AnimalPositions WHERE sourceKey LIKE :like AND processedAt IS NULL) gpsPending`, { like: `load:${tag}:%` })
  const processing = (await select(db, `SELECT TIMESTAMPDIFF(MICROSECOND, receivedAt, processedAt)/1000 ms FROM WaterReadings WHERE sourceKey LIKE :like AND processedAt IS NOT NULL
    UNION ALL SELECT TIMESTAMPDIFF(MICROSECOND, receivedAt, processedAt)/1000 FROM AnimalPositions WHERE sourceKey LIKE :like AND processedAt IS NOT NULL`, { like: `load:${tag}:%` })).map((r) => Number(r.ms))
  const [dup] = await select(db, `SELECT
    (SELECT COUNT(*) FROM (SELECT sourceKey FROM WaterReadings GROUP BY sourceKey HAVING COUNT(*)>1) x) duplicateReadings,
    (SELECT COUNT(*) FROM (SELECT resourceId, occurredAt, JSON_EXTRACT(details,'$.readingId') r FROM HistoryEvents WHERE type='water' AND JSON_EXTRACT(details,'$.readingId') IS NOT NULL GROUP BY resourceId, occurredAt, r HAVING COUNT(*)>1) y) duplicateWaterEvents,
    (SELECT COUNT(*) FROM (SELECT resourceId, conditionName FROM Alerts WHERE resolvedAt IS NULL GROUP BY resourceId, conditionName HAVING COUNT(*)>1) z) duplicateActiveAlerts`)
  const [worker] = await select(db, "SELECT lastSuccessfulCycleAt, lastDurationMs, errorCode FROM WorkerStates WHERE name='monitor'")
  return {
    users: sessions.length, minutes, statuses,
    latencyMs: Object.fromEntries(Object.entries(latency).map(([k, v]) => [k, stats(v)])),
    changes: { submitted: changes.size, pairs: pairs.length, withinLimitPercent: within(pairs), water: within(pairs.filter((p) => p.kind === 'water')), gps: within(pairs.filter((p) => p.kind === 'gps')), visibleMs: stats(pairs.filter((p) => Number.isFinite(p.ms)).map((p) => p.ms)), neverSeen: pairs.filter((p) => !Number.isFinite(p.ms)).length },
    revocation: { removedAfterMs: revocation.removedAfterMs, directAccessStatus: revocation.deniedWrites },
    worker: { processingMs: stats(processing), pending: { water: Number(lag.waterPending), gps: Number(lag.gpsPending) }, received: { water: Number(lag.water), gps: Number(lag.gps) }, lastDurationMs: worker?.lastDurationMs ?? null, errorCode: worker?.errorCode ?? null },
    duplicates: Object.fromEntries(Object.entries(dup).map(([k, v]) => [k, Number(v)])),
    pilotAccounts: Object.keys(ids).length,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = loadEnv()
  const db = createDatabase(env)
  let worker
  ;(async () => {
    await db.authenticate(); await assertSchemaReady(db)
    if (!args['no-worker']) {
      worker = spawn(process.execPath, [fileURLToPath(new URL('../workers/index.js', import.meta.url))], { stdio: ['ignore', 'ignore', 'inherit'], env: process.env })
      await sleep(2000)
    }
    const result = await runLoad({ db, base: process.env.LOAD_BASE_URL ?? 'http://127.0.0.1:3000/api/v1', password: env.DEMO_PASSWORD, environment: env.NODE_ENV, minutes: MINUTES })
    console.log(JSON.stringify(result, null, 2))
  })()
    .catch((error) => { console.error(`Carga interrumpida: ${error.message}`); process.exitCode = 1 })
    .finally(async () => { worker?.kill('SIGTERM'); await db.close() })
}
