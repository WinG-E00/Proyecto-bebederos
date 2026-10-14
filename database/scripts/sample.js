import { pathToFileURL } from 'node:url'
import { z } from 'zod'
import { loadEnv } from '../config/loadEnv.js'
import { createDatabase } from '../db/database.js'
import { select, insert } from '../services/monitoringSql.service.js'
const schema = z.strictObject({
  sourceKey: z.string().min(1).max(191),
  resourceId: z.number().int().positive(),
  measuredAt: z.string().datetime(),
  percentage: z.number().min(0).max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
})
export async function submitSample(
  db,
  kind,
  input,
  { environment = process.env.NODE_ENV, now = new Date() } = {},
) {
  if (!['development', 'test'].includes(environment))
    throw new Error('Muestras permitidas solo en desarrollo/pruebas')
  const value = schema.parse(input)
  const definition = {
    water: ['WaterReadings', 'troughId', ['percentage']],
    troughPosition: ['TroughPositions', 'troughId', ['latitude', 'longitude']],
    animalPosition: ['AnimalPositions', 'animalId', ['latitude', 'longitude']],
  }[kind]
  if (!definition) throw new Error('Tipo de muestra inválido')
  const [table, key, fields] = definition
  for (const f of fields) if (value[f] === undefined) throw new Error('Muestra incompleta')
  for (const f of ['percentage', 'latitude', 'longitude'])
    if (value[f] !== undefined && !fields.includes(f)) throw new Error('Propiedad incompatible')
  const record = {
    sourceKey: value.sourceKey,
    [key]: value.resourceId,
    measuredAt: new Date(value.measuredAt),
    receivedAt: now,
    ...Object.fromEntries(fields.map((f) => [f, value[f]])),
  }
  try {
    return await insert(db, table, record)
  } catch (error) {
    if (error.name !== 'SequelizeUniqueConstraintError') throw error
    const [previous] = await select(db, `SELECT * FROM ${table} WHERE sourceKey=:sourceKey`, {
      sourceKey: value.sourceKey,
    })
    if (
      !previous ||
      previous[key] !== value.resourceId ||
      new Date(previous.measuredAt).getTime() !== new Date(record.measuredAt).getTime() ||
      fields.some((f) => previous[f] !== value[f])
    )
      throw new Error('Clave de fuente reutilizada para otra muestra')
    return previous.id
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = loadEnv()
  const db = createDatabase(env)
  try {
    console.log(
      'Muestra registrada:',
      await submitSample(db, process.argv[2], JSON.parse(process.argv[3]), {
        environment: env.NODE_ENV,
      }),
    )
  } catch {
    console.error('No se pudo registrar la muestra; revisar entorno, tipo y JSON.')
    process.exitCode = 1
  } finally {
    await db.close()
  }
}
