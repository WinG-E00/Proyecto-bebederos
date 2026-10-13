import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { z } from 'zod'
import app, { createApp } from '../../app.js'
import { ApiError } from '../../middleware/errors.js'
import { validate } from '../../middleware/validate.js'
import { pagination, paginated } from '../../services/pagination.js'
import { encryptPayload, decryptPayload } from '../../services/mail.service.js'
import { assertSafeDetails } from '../../services/historyWriter.service.js'
import { createWorker } from '../../workers/index.js'

it('importa la API y deshabilita endpoints legacy sin conectar MySQL', async () => {
  for (const path of ['/api/user/create', '/api/perfil/create', '/api/bebederos/create', '/test', '/api/v1/missing']) {
    const response = await request(app).post(path).send({ role: 'owner' })
    expect(response.status).toBe(404)
    expect(response.body).toEqual({ code: 'NOT_FOUND', message: 'Recurso no encontrado.' })
  }
})
it.each([401, 403, 404, 409, 422, 429, 503])('uniforma el error HTTP %i', async (status) => {
  const api = createApp({ configure: (server) => server.get('/error', () => { throw new ApiError(status, 'TEST_ERROR') }) })
  const response = await request(api).get('/error')
  expect(response.status).toBe(status)
  expect(Object.keys(response.body).sort()).toEqual(['code', 'message'])
})
it('no revela SQL, stack ni secretos en errores inesperados', async () => {
  const api = createApp({ configure: (server) => server.get('/error', () => { throw new Error('SELECT passwordHash, private-token FROM Accounts') }) })
  const response = await request(api).get('/error')
  expect(response.status).toBe(500)
  expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|private-token|SELECT|stack/)
})
it('rechaza JSON inválido y propiedades no declaradas sin filtrar valores', async () => {
  const api = createApp({ configure: (server) => server.post('/validate', validate(z.object({ name: z.string() })), (req, res) => res.json(req.validated.body)) })
  expect((await request(api).post('/validate').send({ name: 'Validado' })).status).toBe(200)
  const extra = await request(api).post('/validate').send({ name: 'Validado', password: 'secret-value' })
  expect(extra.status).toBe(422)
  expect(JSON.stringify(extra.body)).not.toContain('secret-value')
  expect((await request(api).post('/validate').set('Content-Type', 'application/json').send('{broken')).status).toBe(422)
})
it('pagina con los valores del contrato', () => {
  expect(pagination()).toEqual({ page: 1, limit: 50, offset: 0 })
  expect(pagination({ page: '2', limit: '100' })).toEqual({ page: 2, limit: 100, offset: 100 })
  expect(paginated([], 0, pagination())).toEqual({ items: [], total: 0, page: 1, limit: 50 })
})
it.each([{ page: '0' }, { limit: '101' }, { page: '1.5' }, { page: ['1', '2'] }, { page: '-1' }, { page: '1e2' }, { limit: '' }, { page: Number.MAX_SAFE_INTEGER, limit: 100 }])('rechaza paginación inválida %j', (query) => {
  expect(() => pagination(query)).toThrow(ApiError)
})
it('cifra enlaces con nonce distinto y verifica autenticidad', () => {
  const secret = 'outbox-test-secret-32-bytes-or-more'
  const payload = { text: 'https://app.test/verify?token=test-only-secret' }
  const encrypted = encryptPayload(payload, secret)
  expect(encrypted).not.toContain('test-only-secret')
  expect(encrypted).not.toEqual(encryptPayload(payload, secret))
  expect(decryptPayload(encrypted, secret)).toEqual(payload)
  expect(() => decryptPayload(encrypted, 'wrong-test-secret-32-bytes-or-more')).toThrow()
  expect(() => decryptPayload(encrypted.replace('v1.', 'v2.'), secret)).toThrow()
})
it.each([{ password: 'private' }, { nested: [{ tokenHash: 'private' }] }, { link: 'https://app.test/?token=secret' }])('no admite secretos en detalles históricos %j', (details) => {
  expect(() => assertSafeDetails(details)).toThrow(ApiError)
})

describe('ciclos de worker', () => {
  it('impide solapamiento y termina el trabajo en curso al detenerse', async () => {
    let finish
    const job = vi.fn(() => new Promise((resolve) => { finish = resolve }))
    const health = { record: vi.fn().mockResolvedValue(undefined) }
    const worker = createWorker({ jobs: [job], health })
    const running = worker.start()
    await expect(worker.cycle()).rejects.toThrow(/solapados/)
    let stopped = false
    const stopping = worker.stop().then(() => { stopped = true })
    await Promise.resolve()
    expect(stopped).toBe(false)
    finish()
    await stopping; await running
    expect(health.record).toHaveBeenCalledTimes(1)
  })
  it('ejecuta cada cinco segundos sin esperar tiempos reales y permite reinicio', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-13T12:00:00Z'))
    const wait = (ms, _value, { signal }) => new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new DOMException('stop', 'AbortError'))
      const timer = setTimeout(resolve, ms)
      signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('stop', 'AbortError')) }, { once: true })
    })
    const job = vi.fn().mockResolvedValue(undefined)
    const worker = createWorker({ jobs: [job], health: { record: vi.fn() }, wait })
    worker.start()
    await vi.advanceTimersByTimeAsync(4999)
    expect(job).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(job).toHaveBeenCalledTimes(2)
    await worker.stop()
    worker.start(); await vi.advanceTimersByTimeAsync(0); await worker.stop()
    expect(job).toHaveBeenCalledTimes(3)
  })
})
