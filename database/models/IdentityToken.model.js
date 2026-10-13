import { createHash, randomBytes } from 'node:crypto'
import { DataTypes } from 'sequelize'

// "Verificación 24 horas; recuperación 30 minutos; único y de un solo uso."
export const TOKEN_TTL_MS = Object.freeze({ verification: 24 * 60 * 60 * 1000, recovery: 30 * 60 * 1000 })

// El valor viaja solo en el enlace del correo; MySQL guarda su hash.
export function hashToken(token) {
  return createHash('sha256').update(String(token), 'utf8').digest('hex')
}
export function generateToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

export function defineIdentityToken(db) {
  return db.define('IdentityToken', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    accountId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: { type: DataTypes.ENUM('verification', 'recovery'), allowNull: false },
    tokenHash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE(3), allowNull: false },
    consumedAt: { type: DataTypes.DATE(3), allowNull: true },
  }, { tableName: 'IdentityTokens', timestamps: true })
}
