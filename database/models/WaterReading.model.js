import { DataTypes } from 'sequelize'
export function defineWaterReading(db) {
  return db.define(
    'WaterReading',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      sourceKey: { type: DataTypes.STRING(191), allowNull: false, unique: true },
      troughId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      percentage: { type: DataTypes.DOUBLE, allowNull: false, validate: { min: 0, max: 100 } },
      measuredAt: { type: DataTypes.DATE(3), allowNull: false },
      receivedAt: { type: DataTypes.DATE(3), allowNull: false },
      processedAt: { type: DataTypes.DATE(3), allowNull: true },
      processingResult: { type: DataTypes.STRING(50), allowNull: true },
    },
    {
      tableName: 'WaterReadings',
      timestamps: false,
      hooks: {
        beforeUpdate(row) {
          if (
            ['id', 'sourceKey', 'troughId', 'percentage', 'measuredAt', 'receivedAt'].some((key) =>
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
