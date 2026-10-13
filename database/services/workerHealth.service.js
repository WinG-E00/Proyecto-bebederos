import { registerModels } from '../models/index.js'
const codes = new Set(['SMTP_FAILED', 'JOB_FAILED', 'DATABASE_UNAVAILABLE'])
export function createWorkerHealth(db, { name = 'monitor', clock = { now: () => new Date() } } = {}) {
  const { WorkerState } = registerModels(db)
  async function record(durationMs, errorCode = null) {
    const [state] = await WorkerState.findOrCreate({ where: { name }, defaults: { name } })
    await state.update({
      lastDurationMs: Math.min(4294967295, Math.max(0, Math.round(durationMs))),
      errorCode: errorCode ? (codes.has(errorCode) ? errorCode : 'JOB_FAILED') : null,
      ...(errorCode ? {} : { lastSuccessfulCycleAt: clock.now() }),
    })
  }
  async function read() {
    const state = await WorkerState.findByPk(name)
    if (!state) return { available: false }
    return {
      available: true, name: state.name, lastSuccessfulCycleAt: state.lastSuccessfulCycleAt,
      lastDurationMs: state.lastDurationMs, errorCode: state.errorCode,
      stale: !state.lastSuccessfulCycleAt || clock.now() - state.lastSuccessfulCycleAt > 15000,
    }
  }
  return { record, read }
}
