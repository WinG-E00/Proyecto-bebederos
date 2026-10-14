import { DataTypes } from 'sequelize'
export function defineAnimalState(db) {
  return db.define(
    'AnimalState',
    {
      animalId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
      lastPositionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      troughInRangeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: 'AnimalStates', timestamps: false },
  )
}
