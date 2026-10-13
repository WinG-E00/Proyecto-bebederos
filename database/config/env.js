import { z } from 'zod'

const optionalText = z.preprocess((value) => value === '' ? undefined : value, z.string().optional())
const port = z.coerce.number().int().min(1).max(65535)
const secret = z.string().refine((value) => Buffer.byteLength(value, 'utf8') >= 32, 'Se requieren al menos 32 bytes')
const httpUrl = z.string().refine((value) => {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
}, 'Se requiere una URL HTTP(S) sin credenciales')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: port.default(3000),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: port.default(3306),
  DB_NAME: z.string().regex(/^[a-zA-Z0-9_]+$/),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  SESSION_SECRET: secret,
  OUTBOX_SECRET: secret,
  APP_URL: httpUrl,
  VISIT_RADIUS_METERS: z.coerce.number().positive().default(5),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  SMTP_HOST: optionalText,
  SMTP_PORT: port.default(587),
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  SMTP_FROM: z.preprocess((v) => v === '' ? undefined : v, z.email().optional()),
  WEATHER_URL: httpUrl.default('https://customer-api.open-meteo.com/v1/forecast'),
  WEATHER_API_KEY: optionalText,
  MAP_TILE_URL: z.string().default('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
  DEMO_PASSWORD: optionalText,
}).superRefine((env, ctx) => {
  const issue = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message })
  if (env.SESSION_SECRET === env.OUTBOX_SECRET) issue('OUTBOX_SECRET', 'Debe ser distinto de SESSION_SECRET')
  if (env.SMTP_HOST && !env.SMTP_FROM) issue('SMTP_FROM', 'Requerido al configurar SMTP')
  if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD)) issue('SMTP_USER', 'Configurar usuario y contraseña juntos')
  try {
    const tile = new URL(env.MAP_TILE_URL.replace(/\{[szxy]\}/g, '0'))
    if (!['http:', 'https:'].includes(tile.protocol) || tile.username || tile.password || tile.search || tile.hash) {
      issue('MAP_TILE_URL', 'Solo URL pública HTTP(S), sin credenciales ni parámetros secretos')
    }
  } catch { issue('MAP_TILE_URL', 'URL de teselas inválida') }
  if (env.DEMO_PASSWORD && (env.DEMO_PASSWORD.length < 10 || Buffer.byteLength(env.DEMO_PASSWORD) > 72)) {
    issue('DEMO_PASSWORD', 'Entre 10 caracteres y 72 bytes UTF-8')
  }
  if (env.NODE_ENV === 'production') {
    if (!env.APP_URL.startsWith('https://')) issue('APP_URL', 'Producción requiere HTTPS')
    if (!env.SMTP_HOST) issue('SMTP_HOST', 'Configurar SMTP antes de operar')
    if (!env.WEATHER_URL.startsWith('https://customer-api.open-meteo.com/')) issue('WEATHER_URL', 'Configurar endpoint comercial Open-Meteo')
    if (!env.WEATHER_API_KEY) issue('WEATHER_API_KEY', 'Configurar credencial comercial')
    if (env.DEMO_PASSWORD) issue('DEMO_PASSWORD', 'No permitido en producción')
  }
})

// Sin efectos al importar: no carga archivos, no abre MySQL ni envía mensajes.
export function parseEnv(source = process.env) {
  const result = schema.safeParse(source)
  if (!result.success) {
    // No incluir valores de entrada ni el objeto Zod (podría contener secretos).
    throw new Error(`Configuración inválida: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`)
  }
  return Object.freeze(result.data)
}
