import { DataTypes } from 'sequelize'
export function defineInvitation(db) {
  return db.define(
    'Invitation',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      ownerId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        validate: { min: 1 },
      },
      email: {
        type: DataTypes.STRING(254),
        allowNull: false,
        validate: { isEmail: true },
      },
      tokenHash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
      issuedAt: { type: DataTypes.DATE(3), allowNull: false },
      expiresAt: { type: DataTypes.DATE(3), allowNull: false },
      state: {
        type: DataTypes.ENUM('Pendiente', 'Aceptada', 'Retirada', 'Vencida'),
        allowNull: false,
        defaultValue: 'Pendiente',
      },
      deliveryState: {
        type: DataTypes.ENUM('Pendiente', 'Enviado', 'Fallido'),
        allowNull: false,
        defaultValue: 'Pendiente',
      },
      acceptedById: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    {
      tableName: 'Invitations',
      timestamps: true,
      validate: {
        exactExpiry() {
          if (+this.expiresAt - +this.issuedAt !== 7 * 86400000)
            throw Error('La invitación vence a siete días exactos')
        },
      },
    },
  )
}
