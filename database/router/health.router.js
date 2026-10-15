import { Router } from 'express'
import { createWorkerHealth } from '../services/workerHealth.service.js'
import { errorSummary } from '../services/logger.js'

// Salud mínima pública: API y MySQL, sin versiones, host ni secretos.
export function createHealthRouter({ db, logger, clock = { now: () => new Date() } }) {
  const r = Router()
  r.get('/', async (_req, res) => {
    res.set('Cache-Control', 'no-store')
    try {
      await db.query('SELECT 1')
      res.json({ status: 'ok', database: 'up', time: clock.now().toISOString() })
    } catch (error) {
      logger?.error('health.database_unavailable', errorSummary(error))
      res.status(503).json({ status: 'degraded', database: 'down', time: clock.now().toISOString() })
    }
  })
  return r
}

// Detalle del worker solo para monitoreo interno (script/supervisor), no expuesto por HTTP.
export async function workerHealthReport(db, { clock = { now: () => new Date() } } = {}) {
  const worker = await createWorkerHealth(db, { clock }).read()
  return { status: worker.available && !worker.stale && !worker.errorCode ? 'ok' : 'degraded', worker }
}
