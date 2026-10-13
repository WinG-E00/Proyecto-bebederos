import { pathToFileURL } from 'node:url'
import { createApp } from './app.js'
import { loadEnv } from './config/loadEnv.js'
import { createDatabase } from './db/database.js'
import { registerModels } from './models/index.js'
import { assertSchemaReady } from './scripts/migrate.js'

export async function startServer({ env = loadEnv() } = {}) {
  const db = createDatabase(env)
  try {
    await db.authenticate()
    await assertSchemaReady(db)
    registerModels(db)
    const app = createApp({ trustProxy: env.TRUST_PROXY })
    const server = await new Promise((resolve, reject) => {
      const listener = app.listen(env.PORT, '127.0.0.1', () => resolve(listener))
      listener.once('error', reject)
    })
    let closing
    const close = () => closing ??= (async () => {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
      await db.close()
    })()
    return { app, server, db, close }
  } catch (error) { await db.close(); throw error }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().then(({ close }) => {
    console.log('API iniciada en loopback; esquema verificado, sin cambios automáticos.')
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
      close().catch(() => { console.error('No se pudo cerrar la API correctamente.'); process.exitCode = 1 })
    })
  }).catch(() => {
    console.error('No se pudo iniciar la API. Revisar configuración, MySQL y migraciones pendientes.')
    process.exitCode = 1
  })
}
