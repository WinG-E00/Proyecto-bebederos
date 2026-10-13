import { DataTypes } from 'sequelize'

export function defineHistoryEvent(db) {
  const immutable = () => { throw new Error('Los eventos históricos son inmutables') }
  return db.define('HistoryEvent', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    farmId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: { type: DataTypes.ENUM('water', 'gps', 'visit', 'alert', 'task', 'retirement'), allowNull: false },
    resourceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    actorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    occurredAt: { type: DataTypes.DATE(3), allowNull: false },
    details: { type: DataTypes.JSON, allowNull: false },
  }, {
    tableName: 'HistoryEvents', timestamps: false,
    hooks: { beforeUpdate: immutable, beforeDestroy: immutable, beforeBulkUpdate: immutable, beforeBulkDestroy: immutable },
  })
}
