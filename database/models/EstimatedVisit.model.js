import { DataTypes } from 'sequelize'
export function defineEstimatedVisit(db) {
  return db.define(
    'EstimatedVisit',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      farmId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      animalId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      troughId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      positionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
      visitedAt: { type: DataTypes.DATE(3), allowNull: false },
    },
    {
      tableName: 'EstimatedVisits',
      timestamps: false,
      hooks: {
        beforeUpdate(row) {
          if (
            ['id', 'farmId', 'animalId', 'troughId', 'positionId', 'visitedAt'].some((key) =>
              row.changed(key),
            )
          )
            throw new Error('La telemetría es inmutable')
        },
        beforeDestroy() {
          throw new Error('La telemetría es inmutable')
        },
      },
    },
  )
}
