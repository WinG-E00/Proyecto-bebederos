import { DataTypes } from 'sequelize'
export function defineWorkerState(db) {
  return db.define('WorkerState', {
    name: { type: DataTypes.STRING(100), primaryKey: true },
    lastSuccessfulCycleAt: { type: DataTypes.DATE(3), allowNull: true },
    lastDurationMs: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    errorCode: { type: DataTypes.STRING(50), allowNull: true },
  }, { tableName: 'WorkerStates', timestamps: true })
}
