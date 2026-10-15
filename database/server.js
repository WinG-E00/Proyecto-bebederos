import { createWeatherProvider } from './services/weather.service.js'
import { installMonitoringApi } from './router/monitoring.router.js'
import { pathToFileURL } from 'node:url'
import { createApp } from './app.js'
import { loadEnv } from './config/loadEnv.js'
import { createDatabase } from './db/database.js'
import { registerModels } from './models/index.js'
import { assertSchemaReady } from './scripts/migrate.js'
import { createIdentityApi } from './router/auth.router.js'
import { createMailService } from './services/mail.service.js'
import { createHealthRouter } from './router/health.router.js'
import { createLogger, errorSummary, silentLogger } from './services/logger.js'

export async function startServer({ env = loadEnv(), limits, logger = silentLogger } = {}) {
  const db = createDatabase(env)
  try {
    await db.authenticate()
    await assertSchemaReady(db)
    registerModels(db)
    const mail = createMailService(db, { secret: env.OUTBOX_SECRET })
    const identity = createIdentityApi({
      db,
      env,
      limits,
      mail,
    })
    const app = createApp({
      trustProxy: env.TRUST_PROXY,
      logger,
      configure(app) {
        identity.install(app)
        app.use('/api/v1/health', createHealthRouter({ db, logger }))
        installMonitoringApi(app, { db, mail, appUrl: env.APP_URL, logger, weatherProvider: createWeatherProvider({url:env.WEATHER_URL,apiKey:env.WEATHER_API_KEY}) })
      },
    })
    const server = await new Promise((resolve, reject) => {
      const listener = app.listen(env.PORT, '127.0.0.1', () =>
        resolve(listener),
      )
      listener.once('error', reject)
    })
    let closing
    const close = () =>
      (closing ??= (async () => {
        logger.info('api.stopping')
        // Deja de aceptar conexiones, cierra las inactivas y espera respuestas en curso.
        const closed = new Promise((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        )
        server.closeIdleConnections?.()
        await closed
        identity.close()
        await db.close()
        logger.info('api.stopped')
      })())
    return { app, server, db, close }
  } catch (error) {
    await db.close()
    throw error
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const logger = createLogger({ base: { process: 'api' } })
  startServer({ logger })
    .then(({ close }) => {
      logger.info('api.started', { message: 'API en loopback; esquema verificado, sin cambios automáticos.' })
      for (const signal of ['SIGINT', 'SIGTERM'])
        process.once(signal, () => {
          logger.info('api.signal', { signal })
          close().catch((error) => {
            logger.error('api.close_failed', errorSummary(error))
            process.exitCode = 1
          })
        })
    })
    .catch((error) => {
      logger.error('api.start_failed', { ...errorSummary(error), message: 'Revisar configuración, MySQL y migraciones pendientes.' })
      process.exitCode = 1
    })
}
