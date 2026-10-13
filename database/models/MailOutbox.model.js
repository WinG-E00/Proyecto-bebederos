import { DataTypes } from 'sequelize'
export function defineMailOutbox(db) {
  return db.define('MailOutbox', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    invitationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    identityTokenId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    kind: { type: DataTypes.ENUM('invitation', 'verification', 'recovery'), allowNull: false },
    recipient: { type: DataTypes.STRING(254), allowNull: false },
    subject: { type: DataTypes.STRING(255), allowNull: false },
    encryptedPayload: { type: DataTypes.TEXT('medium'), allowNull: true },
    state: { type: DataTypes.ENUM('pending', 'sent', 'failed', 'expired'), allowNull: false, defaultValue: 'pending' },
    attempts: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    nextAttemptAt: { type: DataTypes.DATE(3), allowNull: false },
    expiresAt: { type: DataTypes.DATE(3), allowNull: false },
    sentAt: { type: DataTypes.DATE(3), allowNull: true },
    errorCode: { type: DataTypes.STRING(50), allowNull: true },
  }, { tableName: 'MailOutbox', timestamps: true })
}
