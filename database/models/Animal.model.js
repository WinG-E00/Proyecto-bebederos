import { DataTypes } from 'sequelize'
export function defineAnimal(db) {
  return db.define(
    'Animal',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      farmId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
      species: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },
      breed: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },
      ageYears: { type: DataTypes.DOUBLE, allowNull: false, validate: { min: 0 } },
      state: { type: DataTypes.STRING(100), allowNull: false, validate: { notEmpty: true } },
      deletedAt: { type: DataTypes.DATE(3), allowNull: true },
    },
    { tableName: 'Animals', timestamps: true },
  )
}
