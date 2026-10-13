import session from 'express-session'
import connectSessionSequelize from 'connect-session-sequelize'
import { DataTypes } from 'sequelize'

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000

// Sesión: "Cuenta y token CSRF; permisos se consultan en cada solicitud."
// Tabla `Sessions` de la migración 001; sin sincronización de modelos.
export function defineSession(db) {
  return db.define('Session', {
    sid: { type: DataTypes.STRING(36), primaryKey: true },
    data: { type: DataTypes.TEXT, allowNull: false },
    expires: { type: DataTypes.DATE(3), allowNull: false },
  }, { tableName: 'Sessions', timestamps: true })
}

export function createSessionStore(db) {
  if (!db.models.Session) defineSession(db)
  const SequelizeStore = connectSessionSequelize(session.Store)
  // Limpia sesiones vencidas cada 15 minutos; la vigencia también se valida por solicitud.
  return new SequelizeStore({ db, table: 'Session', expiration: SESSION_TTL_MS, checkExpirationInterval: 15 * 60 * 1000 })
}

// `data` es el JSON que escribe express-session; incluye accountId tras el login.
const byAccount = "CAST(JSON_UNQUOTE(JSON_EXTRACT(data, '$.accountId')) AS UNSIGNED) = :accountId"

export function createSessionService(db) {
  return {
    // Cambiar la contraseña invalida todas las sesiones de esa cuenta.
    async destroyAccountSessions(accountId, { transaction } = {}) {
      await db.query(`DELETE FROM Sessions WHERE ${byAccount}`, { replacements: { accountId }, transaction })
    },
  }
}

const settle = (operation) => new Promise((resolve, reject) => operation((error) => (error ? reject(error) : resolve())))
// Identificador nuevo al autenticar: evita fijación de sesión.
export const regenerateSession = (req) => settle((done) => req.session.regenerate(done))
export const saveSession = (req) => settle((done) => req.session.save(done))
export const destroySession = (req) => settle((done) => req.session.destroy(done))
