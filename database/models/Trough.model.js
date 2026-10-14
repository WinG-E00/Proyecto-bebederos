import { DataTypes } from 'sequelize'
export function defineTrough(db) {
  return db.define(
    'Trough',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      farmId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
      latitude: { type: DataTypes.DOUBLE, allowNull: true },
      longitude: { type: DataTypes.DOUBLE, allowNull: true },
      locationSource: {
        type: DataTypes.ENUM('administrative', 'device'),
        allowNull: false,
        defaultValue: 'administrative',
      },
      capacityLiters: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        validate: { min: Number.MIN_VALUE },
      },
      operationalState: {
        type: DataTypes.ENUM('Operativo', 'En mantenimiento', 'Fuera de servicio'),
        allowNull: false,
        defaultValue: 'Operativo',
      },
      deletedAt: { type: DataTypes.DATE(3), allowNull: true },
    },
    {
      tableName: 'Troughs',
      timestamps: true,
      validate: {
        coordinates() {
          if (
            (this.latitude == null) !== (this.longitude == null) ||
            (this.latitude != null &&
              (Math.abs(this.latitude) > 90 || Math.abs(this.longitude) > 180))
          )
            throw new Error('Coordenadas inválidas')
        },
      },
    },
  )
}
