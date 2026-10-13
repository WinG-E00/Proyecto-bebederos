import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

// No importar db/database.js ni app.js: conectan al entorno operativo.
export function testDatabaseConfig(source = process.env) {
  if (source.NODE_ENV !== 'test') throw new Error('MySQL de pruebas exige NODE_ENV=test')
  if (!source.DB_NAME) throw new Error('DB_NAME es obligatorio para comprobar aislamiento')
  const name = source.TEST_DB_NAME
  if (!name || !/^[a-zA-Z0-9_]+_test$/.test(name)) throw new Error('TEST_DB_NAME debe terminar en _test')
  if (name.toLowerCase() === source.DB_NAME.toLowerCase()) throw new Error('La base de pruebas no puede ser la operativa')
  for (const key of ['TEST_DB_HOST', 'TEST_DB_PORT', 'TEST_DB_USER', 'TEST_DB_PASSWORD']) {
    if (!source[key]) throw new Error(`${key} es obligatorio; no se reutilizan credenciales operativas`)
  }
  if (source.TEST_DB_USER.toLowerCase() === 'root' || (source.DB_USER && source.TEST_DB_USER.toLowerCase() === source.DB_USER.toLowerCase())) {
    throw new Error('Usar un usuario exclusivo de pruebas con permisos limitados, nunca root ni DB_USER')
  }
  const port = Number(source.TEST_DB_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('TEST_DB_PORT inválido')
  return Object.freeze({ name, user: source.TEST_DB_USER, password: source.TEST_DB_PASSWORD, host: source.TEST_DB_HOST, port })
}

export function loadTestEnvironment() {
  // No leer .env operativo. Las variables de shell tienen precedencia.
  dotenv.config({ path: fileURLToPath(new URL('../../.env.test', import.meta.url)), quiet: true })
  return testDatabaseConfig()
}

export function createTestDatabase(source = process.env) {
  const config = testDatabaseConfig(source)
  return new Sequelize(config.name, config.user, config.password, {
    dialect: 'mysql', host: config.host, port: config.port,
    logging: false, timezone: '+00:00', pool: { max: 2, min: 0 },
  })
}

// Recibe el migrador explícito que llegará en T010. No sync, DROP ni borrado de tablas.
export async function prepareTestDatabase(migrate, source = process.env) {
  if (typeof migrate !== 'function') throw new Error('Se requiere un migrador explícito de pruebas')
  const db = createTestDatabase(source)
  try {
    await db.authenticate()
    await migrate(db)
    return db
  } catch (error) {
    await db.close()
    // Evitar SQL/credenciales presentes en errores del driver.
    throw new Error('No se pudo preparar MySQL de pruebas; revisar servicio, permisos y migraciones', { cause: { name: error.name } })
  }
}
