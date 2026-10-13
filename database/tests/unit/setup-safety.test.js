import { describe, expect, it } from 'vitest'
import express from 'express'
import request from 'supertest'
import { parseEnv } from '../../config/env.js'
import { createTestDatabase, testDatabaseConfig } from '../helpers/testDatabase.js'
import { controlledProviders } from '../helpers/providers.js'

const backendEnv = {
  NODE_ENV: 'development', DB_NAME: 'bebederos_dev', DB_USER: 'dev', DB_PASSWORD: 'test-only-password',
  SESSION_SECRET: 's'.repeat(32), OUTBOX_SECRET: 'o'.repeat(32), APP_URL: 'http://localhost:5173',
}
const testEnv = {
  NODE_ENV: 'test', DB_NAME: 'bebederos_dev', DB_USER: 'dev',
  TEST_DB_HOST: '127.0.0.1', TEST_DB_PORT: '3306', TEST_DB_NAME: 'bebederos_test',
  TEST_DB_USER: 'test_user', TEST_DB_PASSWORD: 'test-only-password',
}

describe('seguridad de configuración y aislamiento de pruebas', () => {
  it('rechaza secretos compartidos y no los incluye en los errores', () => {
    const secret = 'private-value-that-must-not-appear'
    try {
      parseEnv({ ...backendEnv, SESSION_SECRET: secret, OUTBOX_SECRET: secret })
      throw new Error('Se esperaba rechazar configuración')
    } catch (error) {
      expect(error.message).toContain('OUTBOX_SECRET')
      expect(error.message).not.toContain(secret)
    }
  })
  it('rechaza producción sin HTTPS y credencial climática comercial', () => {
    expect(() => parseEnv({ ...backendEnv, NODE_ENV: 'production' })).toThrow(/APP_URL.*WEATHER_API_KEY/)
  })
  it('rechaza credenciales en las teselas públicas y configuración SMTP incompleta', () => {
    expect(() => parseEnv({ ...backendEnv, MAP_TILE_URL: 'https://user:secret@tiles.test/{z}/{x}/{y}.png' })).toThrow(/MAP_TILE_URL/)
    expect(() => parseEnv({ ...backendEnv, SMTP_HOST: 'smtp.test' })).toThrow(/SMTP_FROM/)
  })
  it('valida desarrollo sin hacer conexiones a proveedores', () => {
    expect(parseEnv(backendEnv).PORT).toBe(3000)
  })
  it.each([
    { NODE_ENV: 'production' },
    { DB_NAME: 'BEBEDEROS_TEST' },
    { DB_NAME: '' },
    { TEST_DB_NAME: 'bebederos_dev' },
    { TEST_DB_USER: 'root' },
    { TEST_DB_USER: 'dev' },
    { TEST_DB_PASSWORD: '' },
    { TEST_DB_PORT: 'invalid' },
  ])('impide abrir una conexión con configuración insegura: %j', (override) => {
    expect(() => createTestDatabase({ ...testEnv, ...override })).toThrow()
  })
  it('prepara una conexión MySQL exclusivamente de pruebas sin abrirla', async () => {
    expect(testDatabaseConfig(testEnv).name).toBe('bebederos_test')
    const db = createTestDatabase(testEnv)
    expect(db.getDialect()).toBe('mysql')
    expect(db.getDatabaseName()).toBe('bebederos_test')
    await db.close()
  })
  it('permite controlar reloj y sustituir correo y clima', async () => {
    const providers = controlledProviders()
    providers.clock.set('2026-10-13T13:00:00Z')
    expect(providers.clock.now().toISOString()).toBe('2026-10-13T13:00:00.000Z')
    expect(await providers.smtp.sendMail()).toMatchObject({ messageId: 'test-only' })
    expect(await providers.weather.fetch()).toMatchObject({ temperatureC: 24 })
  })
})

it('Supertest puede probar Express sin importar el arranque legacy', async () => {
  const app = express()
  app.get('/tooling-health', (_req, res) => res.json({ testOnly: true }))
  await request(app).get('/tooling-health').expect(200, { testOnly: true })
})
