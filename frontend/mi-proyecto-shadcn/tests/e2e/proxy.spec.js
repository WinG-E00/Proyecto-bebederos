import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'

let server
test.beforeAll(async () => {
  // Servidor controlado solo para verificar transporte; nunca importar la API legacy.
  server = createServer(async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Set-Cookie', 'tooling=test-only; HttpOnly; SameSite=Lax; Path=/')
    res.statusCode = req.method === 'POST' ? 409 : 404
    res.end(JSON.stringify({
      testOnly: true, path: req.url, method: req.method,
      csrf: req.headers['x-csrf-token'], cookie: req.headers.cookie,
      body: Buffer.concat(chunks).toString(),
    }))
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(3000, '127.0.0.1', resolve)
  })
})
test.afterAll(async () => {
  if (server?.listening) await new Promise((resolve) => server.close(resolve))
})

test('proxy preserva /api y su error JSON sin fallback HTML', async ({ request }) => {
  const response = await request.get('/api/v1/__tooling__/missing?farmId=7')
  expect(response.status()).toBe(404)
  expect(response.headers()['content-type']).toContain('application/json')
  expect(response.headers()['set-cookie']).toContain('HttpOnly')
  expect(await response.json()).toMatchObject({ testOnly: true, path: '/api/v1/__tooling__/missing?farmId=7' })
})

test('proxy conserva escritura, cookie, CSRF y conflicto', async ({ request }) => {
  const response = await request.post('/api/v1/__tooling__/write', {
    headers: { 'X-CSRF-Token': 'tooling-csrf', Cookie: 'session=test-only' },
    data: { testOnly: true },
  })
  expect(response.status()).toBe(409)
  expect(await response.json()).toMatchObject({
    path: '/api/v1/__tooling__/write', method: 'POST', csrf: 'tooling-csrf',
    cookie: 'session=test-only', body: JSON.stringify({ testOnly: true }),
  })
})
