import { DataTypes } from 'sequelize'
export function defineAssignment(db) {
  return db.define(
    'Assignment',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      farmId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        validate: { min: 1 },
      },
      workerId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        validate: { min: 1 },
      },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      revokedAt: { type: DataTypes.DATE(3), allowNull: true },
    },
    {
      tableName: 'Assignments',
      timestamps: true,
      indexes: [{ unique: true, fields: ['farmId', 'workerId'] }],
    },
  )
}
