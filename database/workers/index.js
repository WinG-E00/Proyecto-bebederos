import {createInvitationsWorker} from './invitations.worker.js'
import { createMonitorWorker } from './monitor.worker.js'
import { pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { loadEnv } from '../config/loadEnv.js'
import { createDatabase } from '../db/database.js'
import { assertSchemaReady } from '../scripts/migrate.js'
import { registerModels } from '../models/index.js'
import { createMailService, smtpTransport } from '../services/mail.service.js'
import { createMailWorker } from './mail.worker.js'
import { createWorkerHealth } from '../services/workerHealth.service.js'

export function createWorker({
  jobs,
  health,
  clock = { now: () => new Date() },
  intervalMs = 5000,
  wait = delay,
}) {
  let loop
  let controller
  let activeCycle = false
  async function cycle() {
    if (activeCycle) throw new Error('No se permiten ciclos solapados')
    activeCycle = true
    const started = clock.now().getTime()
    let errorCode = null
    try {
      for (const job of jobs) {
        try {
          const result = await job()
          if (result?.errorCode) errorCode = result.errorCode
        } catch {
          errorCode = 'JOB_FAILED'
        }
      }
      await health.record(clock.now().getTime() - started, errorCode)
    } finally {
      activeCycle = false
    }
  }
  function start() {
    if (loop) throw new Error('El worker ya está iniciado')
    controller = new AbortController()
    loop = (async () => {
      while (!controller.signal.aborted) {
        const started = clock.now().getTime()
        try {
          await cycle()
        } catch {
          /* La siguiente vuelta reintenta salud/jobs sin imprimir secretos. */
        }
        const remaining = Math.max(0, intervalMs - (clock.now().getTime() - started))
        try {
          await wait(remaining, undefined, { signal: controller.signal })
        } catch (error) {
          if (error.name !== 'AbortError') throw error
        }
      }
    })()
    return loop
  }
  async function stop() {
    controller?.abort()
    try {
      await loop
    } finally {
      loop = undefined
    }
  }
  return { start, stop, cycle }
}
export async function startWorker({ env = loadEnv() } = {}) {
  const db = createDatabase(env)
  let connection
  let locked = false
  const lockName = `bebederos:worker:${db.getDatabaseName()}`.slice(0, 64)
  try {
    await db.authenticate()
    await assertSchemaReady(db)
    registerModels(db)
    connection = await db.connectionManager.getConnection({ type: 'WRITE' })
    const [[row]] = await connection
      .promise()
      .query('SELECT GET_LOCK(?, 0) AS acquired', [lockName])
    locked = row.acquired === 1
    if (!locked) throw new Error('Ya existe un worker activo para esta base')
    const mail = createMailService(db, { secret: env.OUTBOX_SECRET })
    const transport = env.SMTP_HOST ? smtpTransport(env) : null
    const mailWorker = createMailWorker(db, { mail, transport, from: env.SMTP_FROM })
    const monitor = createMonitorWorker(db, { radius: env.VISIT_RADIUS_METERS })
    const worker = createWorker({
      jobs: [createInvitationsWorker(db).process, mailWorker.processNext, monitor.process],
      health: createWorkerHealth(db),
    })
    const running = worker.start()
    let closing
    const close = () =>
      (closing ??= (async () => {
        try {
          await worker.stop()
        } finally {
          transport?.close()
          try {
            await connection.promise().query('SELECT RELEASE_LOCK(?)', [lockName])
          } finally {
            await db.connectionManager.releaseConnection(connection)
            await db.close()
          }
        }
      })())
    return { worker, db, running, close }
  } catch (error) {
    if (locked) await connection.promise().query('SELECT RELEASE_LOCK(?)', [lockName])
    if (connection) await db.connectionManager.releaseConnection(connection)
    await db.close()
    throw error
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startWorker()
    .then(({ close, running }) => {
      console.log('Worker iniciado; ciclo 5 s y trabajos implementados únicamente.')
      running.catch(() => {
        console.error('Worker detenido por fallo clasificado.')
        process.exitCode = 1
        close().catch(() => {})
      })
      for (const signal of ['SIGINT', 'SIGTERM'])
        process.once(signal, () => {
          close().catch(() => {
            console.error('No se pudo cerrar el worker correctamente.')
            process.exitCode = 1
          })
        })
    })
    .catch(() => {
      console.error(
        'No se pudo iniciar el worker. Revisar configuración, esquema y procesos activos.',
      )
      process.exitCode = 1
    })
}
