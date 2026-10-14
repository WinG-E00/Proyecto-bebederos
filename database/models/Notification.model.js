import { DataTypes } from 'sequelize'
export function defineNotification(db) {
  return db.define(
    'Notification',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      farmId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      recipientId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      taskId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      type: { type: DataTypes.STRING(50), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      occurredAt: { type: DataTypes.DATE(3), allowNull: false },
      readAt: { type: DataTypes.DATE(3), allowNull: true },
    },
    { tableName: 'Notifications', timestamps: false },
  )
}
