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
import { createLogger, errorSummary, silentLogger } from '../services/logger.js'

const HEARTBEAT_EVERY = 12

export function createWorker({
  jobs,
  health,
  clock = { now: () => new Date() },
  intervalMs = 5000,
  wait = delay,
  logger = silentLogger,
}) {
  let loop
  let controller
  let activeCycle = false
  let cycles = 0
  // Cada trabajo puede ser una función o {name, run}; el nombre solo identifica logs.
  const named = jobs.map((job, index) =>
    typeof job === 'function' ? { name: job.name || `job${index + 1}`, run: job } : job,
  )
  async function cycle(lagMs = 0) {
    if (activeCycle) throw new Error('No se permiten ciclos solapados')
    activeCycle = true
    const started = clock.now().getTime()
    let errorCode = null
    let processed = 0
    try {
      for (const job of named) {
        try {
          const result = await job.run()
          if (typeof result?.processed === 'number') processed += result.processed
          else if (result?.processed === true) processed += 1
          if (result?.errorCode) {
            errorCode = result.errorCode
            // SMTP/cola: solo código y estado, nunca destinatario, asunto ni payload.
            logger.warn('worker.job_failed', { job: job.name, errorCode: result.errorCode, state: result.state })
          }
        } catch (error) {
          errorCode = 'JOB_FAILED'
          logger.error('worker.job_failed', { job: job.name, errorCode, ...errorSummary(error) })
        }
      }
      const durationMs = clock.now().getTime() - started
      await health.record(durationMs, errorCode)
      cycles += 1
      // Duración y atraso: siempre ante errores, lentitud o trabajo; si no, un latido por minuto.
      if (errorCode || durationMs > intervalMs || lagMs > 1000 || processed || cycles % HEARTBEAT_EVERY === 1)
        logger[errorCode || durationMs > intervalMs ? 'warn' : 'info']('worker.cycle', { durationMs, lagMs, processed, errorCode })
    } finally {
      activeCycle = false
    }
  }
  function start() {
    if (loop) throw new Error('El worker ya está iniciado')
    controller = new AbortController()
    loop = (async () => {
      let scheduled = clock.now().getTime()
      while (!controller.signal.aborted) {
        const started = clock.now().getTime()
        try {
          await cycle(Math.max(0, started - scheduled))
        } catch (error) {
          // La siguiente vuelta reintenta salud/jobs sin imprimir secretos.
          logger.error('worker.cycle_failed', errorSummary(error))
        }
        scheduled = started + intervalMs
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
export async function startWorker({ env = loadEnv(), logger = silentLogger } = {}) {
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
      jobs: [
        { name: 'invitations', run: createInvitationsWorker(db).process },
        { name: 'mail', run: mailWorker.processNext },
        { name: 'monitor', run: monitor.process },
      ],
      health: createWorkerHealth(db),
      logger,
    })
    const running = worker.start()
    let closing
    const close = () =>
      (closing ??= (async () => {
        logger.info('worker.stopping')
        try {
          await worker.stop()
        } finally {
          transport?.close()
          try {
            await connection.promise().query('SELECT RELEASE_LOCK(?)', [lockName])
          } finally {
            await db.connectionManager.releaseConnection(connection)
            await db.close()
            logger.info('worker.stopped')
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
  const logger = createLogger({ base: { process: 'worker' } })
  startWorker({ logger })
    .then(({ close, running }) => {
      logger.info('worker.started', { intervalMs: 5000 })
      running.catch((error) => {
        logger.error('worker.crashed', errorSummary(error))
        process.exitCode = 1
        close().catch(() => {})
      })
      for (const signal of ['SIGINT', 'SIGTERM'])
        process.once(signal, () => {
          logger.info('worker.signal', { signal })
          close().catch((error) => {
            logger.error('worker.close_failed', errorSummary(error))
            process.exitCode = 1
          })
        })
    })
    .catch((error) => {
      logger.error('worker.start_failed', { ...errorSummary(error), message: 'Revisar configuración, esquema y procesos activos.' })
      process.exitCode = 1
    })
}
