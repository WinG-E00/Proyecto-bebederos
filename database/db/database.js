import { Sequelize } from 'sequelize'

// Construcción explícita, sin conexión ni sincronización al importar.
export function createDatabase(env) {
  return new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
    host: env.DB_HOST, port: env.DB_PORT, dialect: 'mysql', timezone: '+00:00',
    logging: false, define: { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' },
    pool: { max: 5, min: 0 },
  })
}
