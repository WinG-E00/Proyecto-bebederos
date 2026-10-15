import express from 'express'
import { ApiError, errorHandler, notFound } from './middleware/errors.js'
import { requestLogger, silentLogger } from './services/logger.js'

// Importar la API no carga .env, abre conexiones, sincroniza tablas ni escucha puertos.
export function createApp({ configure, trustProxy = 0, logger = silentLogger } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', trustProxy)
  app.locals.logger = logger
  app.use(requestLogger(logger))
  app.use(express.json({ limit: '100kb' }))
  app.use(['/api/user', '/api/perfil', '/api/bebederos'], (_req, _res, next) => {
    next(new ApiError(404, 'NOT_FOUND'))
  })
  configure?.(app)
  app.use(notFound)
  app.use(errorHandler)
  return app
}
export default createApp()
