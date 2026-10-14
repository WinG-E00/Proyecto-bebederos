import { DataTypes } from 'sequelize'
export function defineAnimalPosition(db) {
  return db.define(
    'AnimalPosition',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      sourceKey: { type: DataTypes.STRING(191), allowNull: false, unique: true },
      animalId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      latitude: { type: DataTypes.DOUBLE, allowNull: false, validate: { min: -90, max: 90 } },
      longitude: { type: DataTypes.DOUBLE, allowNull: false, validate: { min: -180, max: 180 } },
      measuredAt: { type: DataTypes.DATE(3), allowNull: false },
      receivedAt: { type: DataTypes.DATE(3), allowNull: false },
      processedAt: { type: DataTypes.DATE(3), allowNull: true },
      processingResult: { type: DataTypes.STRING(50), allowNull: true },
    },
    {
      tableName: 'AnimalPositions',
      timestamps: false,
      hooks: {
        beforeUpdate(row) {
          if (
            [
              'id',
              'sourceKey',
              'animalId',
              'latitude',
              'longitude',
              'measuredAt',
              'receivedAt',
            ].some((key) => row.changed(key))
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
