import { ApiError } from './errors.js'
export function validate(schema, source = 'body') {
  if (!['body', 'query', 'params'].includes(source)) throw new Error('Fuente de validación inválida')
  const strictSchema = typeof schema.strict === 'function' ? schema.strict() : schema
  return (req, _res, next) => {
    const parsed = strictSchema.safeParse(req[source])
    if (!parsed.success) {
      const fields = {}
      for (const issue of parsed.error.issues) fields[issue.path.join('.') || source] = 'Valor inválido o propiedad no permitida.'
      return next(new ApiError(422, 'VALIDATION_ERROR', fields))
    }
    req.validated ??= {}; req.validated[source] = parsed.data
    next()
  }
}
