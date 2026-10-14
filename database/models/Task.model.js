import { DataTypes } from 'sequelize'
import { TASK_STATES } from '../services/taskTransitions.service.js'
export function defineTask(db) {
  return db.define(
    'Task',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      farmId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true },
      },
      description: { type: DataTypes.TEXT, allowNull: false },
      priority: {
        type: DataTypes.ENUM('Baja', 'Media', 'Alta'),
        allowNull: false,
        defaultValue: 'Media',
      },
      deadline: { type: DataTypes.DATE(3), allowNull: false },
      state: {
        type: DataTypes.ENUM(...TASK_STATES),
        allowNull: false,
        defaultValue: 'Pendiente',
      },
      workerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      troughId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      version: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 },
      },
    },
    { tableName: 'Tasks', timestamps: true },
  )
}
