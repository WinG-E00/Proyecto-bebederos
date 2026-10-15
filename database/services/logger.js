// Logs estructurados (una línea JSON por evento) sin secretos ni datos personales.
// Nunca registrar contraseñas, tokens, cookies, payload de correo, credenciales ni correos.
const SENSITIVE = /pass|token|secret|cookie|authorization|csrf|payload|api.?key|credential|email|recipient|sid|session/i
const MAX_DEPTH = 4

export function redact(value, depth = 0) {
  if (value == null || typeof value !== 'object') return typeof value === 'string' ? value.slice(0, 500) : value
  if (value instanceof Date) return value.toISOString()
  if (depth >= MAX_DEPTH) return '[truncado]'
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1))
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, SENSITIVE.test(key) ? '[redactado]' : redact(item, depth + 1)]),
  )
}

// Rutas sin query string: los enlaces de invitación/verificación llevan tokens en la query.
export function safePath(url = '') {
  return String(url).split('?')[0].slice(0, 200)
}

// Solo nombre/código del error: el mensaje del driver puede incluir SQL o credenciales.
export function errorSummary(error) {
  return { errorName: error?.name ?? 'Error', ...(typeof error?.code === 'string' && { errorCode: error.code }) }
}

export function createLogger({
  write = (line) => process.stdout.write(`${line}\n`),
  clock = { now: () => new Date() },
  base = {},
} = {}) {
  function log(level, event, fields = {}) {
    try {
      write(JSON.stringify({ time: clock.now().toISOString(), level, event, ...redact(base), ...redact(fields) }))
    } catch {
      // Un fallo del destino de logs no debe interrumpir la API ni el worker.
    }
  }
  return {
    info: (event, fields) => log('info', event, fields),
    warn: (event, fields) => log('warn', event, fields),
    error: (event, fields) => log('error', event, fields),
    child: (extra) => createLogger({ write, clock, base: { ...base, ...extra } }),
  }
}

export const silentLogger = Object.freeze({
  info() {}, warn() {}, error() {}, child() { return silentLogger },
})

// Registro HTTP: método, ruta sin query, estado y duración. Sin cuerpo, cabeceras ni cookies.
export function requestLogger(logger) {
  return (req, res, next) => {
    const started = process.hrtime.bigint()
    res.once('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1e6
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
      logger[level]('http.request', {
        method: req.method, path: safePath(req.originalUrl), status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
      })
    })
    next()
  }
}
