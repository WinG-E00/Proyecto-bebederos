import { describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createLogger, redact, requestLogger, safePath } from '../../services/logger.js'
import { createApp } from '../../app.js'
import { createWorker } from '../../workers/index.js'

const capture = () => {
  const lines = []
  return { lines, logger: createLogger({ write: (line) => lines.push(JSON.parse(line)), clock: { now: () => new Date('2026-10-14T12:00:00Z') } }) }
}

describe('logs estructurados', () => {
  it('redacta secretos y datos personales en cualquier nivel', () => {
    const out = redact({ password: 'x', nested: { tokenHash: 'y', apiKey: 'k', recipient: 'a@b.c', ok: 1 }, list: [{ sessionId: 's' }], csrfToken: 't', SMTP_PASSWORD: 'p' })
    expect(JSON.stringify(out)).not.toMatch(/"x"|"y"|"k"|a@b\.c|"s"|"t"|"p"/)
    expect(out.nested.ok).toBe(1)
  })
  it('quita query strings con tokens de las rutas', () => {
    expect(safePath('/api/v1/invitations/preview?token=secreto')).toBe('/api/v1/invitations/preview')
  })
  it('una línea JSON por evento con hora, nivel y base', () => {
    const { lines, logger } = capture()
    logger.child({ process: 'api' }).warn('weather.refresh_failed', { farmId: 3, errorName: 'TimeoutError' })
    expect(lines).toEqual([{ time: '2026-10-14T12:00:00.000Z', level: 'warn', event: 'weather.refresh_failed', process: 'api', farmId: 3, errorName: 'TimeoutError' }])
  })
  it('registra método, ruta sin query, estado y duración; sin cuerpo ni cookies', async () => {
    const { lines, logger } = capture()
    const app = express().use(requestLogger(logger)).post('/x', (_req, res) => res.status(201).end())
    await request(app).post('/x?token=abc').set('Cookie', 'bebederos.sid=zzz').send({ password: 'secreta' }).expect(201)
    expect(lines[0]).toMatchObject({ event: 'http.request', method: 'POST', path: '/x', status: 201, level: 'info' })
    expect(JSON.stringify(lines)).not.toMatch(/abc|zzz|secreta/)
  })
  it('errores 500 se registran solo con nombre/código, sin mensaje ni SQL', async () => {
    const { lines, logger } = capture()
    const app = createApp({ logger, configure(app) { app.get('/boom', () => { const e = new Error('SELECT * FROM Accounts password=123'); e.name = 'SequelizeDatabaseError'; throw e }) } })
    const res = await request(app).get('/boom').expect(500)
    expect(res.body).toEqual({ code: 'INTERNAL_ERROR', message: 'No se pudo completar la operación.' })
    expect(lines.find((l) => l.event === 'http.error')).toMatchObject({ level: 'error', code: 'INTERNAL_ERROR', errorName: 'SequelizeDatabaseError' })
    expect(JSON.stringify(lines)).not.toMatch(/SELECT|123/)
  })
})

describe('worker: duración, atraso y fallos', () => {
  it('registra fallos SMTP por código sin destinatario y fallos inesperados por nombre', async () => {
    const { lines, logger } = capture()
    const health = { record: vi.fn() }
    const worker = createWorker({
      logger, health,
      jobs: [
        { name: 'mail', run: async () => ({ processed: true, state: 'pending', errorCode: 'SMTP_FAILED' }) },
        { name: 'monitor', run: async () => { throw Object.assign(new Error('pass=secreto'), { name: 'SequelizeConnectionError' }) } },
      ],
    })
    await worker.cycle(1500)
    expect(lines.filter((l) => l.event === 'worker.job_failed')).toEqual([
      expect.objectContaining({ job: 'mail', errorCode: 'SMTP_FAILED', state: 'pending' }),
      expect.objectContaining({ job: 'monitor', errorCode: 'JOB_FAILED', errorName: 'SequelizeConnectionError' }),
    ])
    expect(lines.find((l) => l.event === 'worker.cycle')).toMatchObject({ level: 'warn', lagMs: 1500, processed: 1, errorCode: 'JOB_FAILED' })
    expect(health.record).toHaveBeenCalledWith(expect.any(Number), 'JOB_FAILED')
    expect(JSON.stringify(lines)).not.toMatch(/secreto/)
  })
})
