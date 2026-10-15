import { errorSummary, safePath } from '../services/logger.js'

const messages = {
  401: 'Iniciá sesión para continuar.',
  403: 'No tenés permiso para esta acción.',
  404: 'Recurso no encontrado.',
  409: 'La operación entra en conflicto con el estado actual.',
  422: 'Revisá los datos ingresados.',
  429: 'Demasiadas solicitudes. Intentá más tarde.',
  503: 'El servicio no está disponible. Intentá nuevamente.',
  500: 'No se pudo completar la operación.',
}
export class ApiError extends Error {
  constructor(status, code, fields, message) {
    super(message ?? messages[status] ?? messages[500])
    this.status = status
    this.code = code
    this.fields = fields
  }
}
export function notFound(_req, _res, next) {
  next(new ApiError(404, 'NOT_FOUND'))
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)
  let status = 500
  let code = 'INTERNAL_ERROR'
  if (error instanceof ApiError && Object.hasOwn(messages, error.status)) {
    status = error.status
    code = error.code
  } else if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') {
    status = 422
    code = 'INVALID_BODY'
  } else if (
    ['SequelizeUniqueConstraintError', 'SequelizeForeignKeyConstraintError'].includes(error.name)
  ) {
    status = 409
    code = 'CONFLICT'
  } else if (error.name?.startsWith('SequelizeConnection')) {
    status = 503
    code = 'DEPENDENCY_UNAVAILABLE'
  }
  // Fallos internos y de dependencias: solo nombre/código, nunca mensaje, SQL ni stack.
  if (status >= 500) req.app?.locals.logger?.error('http.error', { code, path: safePath(req.originalUrl), ...errorSummary(error) })
  const body = { code, message: error instanceof ApiError ? error.message : messages[status] }
  if (status === 422 && error instanceof ApiError && error.fields) body.fields = error.fields
  res.status(status).json(body)
}
