import { Umzug } from 'umzug'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { loadEnv } from '../config/loadEnv.js'
import { createDatabase } from '../db/database.js'
import * as identity from '../migrations/001-identity-fields.js'
import * as monitoring from '../migrations/002-monitoring-fields.js'
import * as workflow from '../migrations/003-workflow-fields.js'

export const versions = ['001-identity-fields.js', '002-monitoring-fields.js', '003-workflow-fields.js']
const modules = [identity, monitoring, workflow]

async function mysqlVersion(db) {
  const [[row]] = await db.query('SELECT VERSION() AS version')
  const [major, minor, patch] = row.version.split('.').map(Number)
  if (/mariadb/i.test(row.version) || major !== 8 || (minor === 0 && patch < 16)) throw new Error('Se requiere MySQL 8.0.16 o posterior de la familia 8')
}
function migrator(db) {
  return new Umzug({
    context: db, logger: undefined,
    migrations: versions.map((name, index) => ({ name, up: modules[index].up, down: modules[index].down })),
    // Metadata explícita: no SequelizeStorage.sync ni sincronización de modelos.
    storage: {
      async executed() { const [rows] = await db.query('SELECT name FROM SchemaMigrations ORDER BY name'); return rows.map((row) => row.name) },
      async logMigration({ name }) { await db.query('INSERT INTO SchemaMigrations (name) VALUES (:name)', { replacements: { name } }) },
      async unlogMigration() { throw new Error('No se permite retroceder migraciones con datos históricos') },
    },
  })
}
export async function migrateDatabase(db) {
  await mysqlVersion(db)
  const connection = await db.connectionManager.getConnection({ type: 'WRITE' })
  const lockName = `bebederos:migrate:${createHash('sha256').update(db.getDatabaseName()).digest('hex').slice(0, 40)}`
  let acquired = false
  try {
    const [[row]] = await connection.promise().query('SELECT GET_LOCK(?, 10) AS acquired', [lockName])
    acquired = row.acquired === 1
    if (!acquired) throw new Error('Otra migración está en ejecución')
    await db.query('CREATE TABLE IF NOT EXISTS SchemaMigrations (name VARCHAR(191) COLLATE utf8mb4_bin PRIMARY KEY) ENGINE=InnoDB')
    const applied = await migrator(db).up()
    return applied.map((migration) => migration.name)
  } finally {
    if (acquired) await connection.promise().query('SELECT RELEASE_LOCK(?)', [lockName])
    await db.connectionManager.releaseConnection(connection)
  }
}
export async function assertSchemaReady(db) {
  await mysqlVersion(db)
  const [rows] = await db.query('SELECT name FROM SchemaMigrations ORDER BY name')
  if (versions.some((name) => !rows.some((row) => row.name === name))) throw new Error('Ejecutar migrate antes de iniciar API/worker')
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let db
  try {
    db = createDatabase(loadEnv())
    const applied = await migrateDatabase(db)
    console.log(`Migraciones aplicadas: ${applied.length}. Sin borrar tablas ni registros.`)
  } catch {
    console.error('Migración fallida. Revisar MySQL 8, permisos y esquema; no se eliminaron datos automáticamente.')
    process.exitCode = 1
  } finally { await db?.close() }
}
