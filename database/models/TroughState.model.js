import { DataTypes } from 'sequelize'
export function defineTroughState(db) {
  return db.define(
    'TroughState',
    {
      troughId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
      lastReadingId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      lastPositionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: 'TroughStates', timestamps: false },
  )
}
