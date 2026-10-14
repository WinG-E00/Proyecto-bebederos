import { DataTypes } from 'sequelize'
export function defineAlert(db) {
  return db.define('Alert', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    farmId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    resourceType: { type: DataTypes.ENUM('trough', 'animal'), allowNull: false },
    resourceId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    conditionName: { type: DataTypes.STRING(50), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    generatedAt: { type: DataTypes.DATE(3), allowNull: false },
    resolvedAt: { type: DataTypes.DATE(3), allowNull: true },
    activeKey: { type: DataTypes.STRING(191), unique: true, allowNull: true },
  }, { tableName: 'Alerts', timestamps: false })
}
