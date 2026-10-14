import { DataTypes } from 'sequelize'
export function defineFarm(db) {
  return db.define(
    'Farm',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      ownerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      ownerRole: {
        type: DataTypes.ENUM('owner', 'worker'),
        defaultValue: 'owner',
        allowNull: false,
      },
      name: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
      latitude: { type: DataTypes.DOUBLE, allowNull: false, validate: { min: -90, max: 90 } },
      longitude: { type: DataTypes.DOUBLE, allowNull: false, validate: { min: -180, max: 180 } },
      areaHa: { type: DataTypes.DOUBLE, allowNull: false, validate: { min: 0 } },
      description: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
      staleMinutes: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 180,
        validate: { min: 1 },
      },
      timezone: {
        type: DataTypes.STRING(64),
        allowNull: false,
        validate: {
          iana(value) {
            new Intl.DateTimeFormat('es', { timeZone: value })
          },
        },
      },
      deletedAt: { type: DataTypes.DATE(3), allowNull: true },
    },
    { tableName: 'Farms', timestamps: true },
  )
}
