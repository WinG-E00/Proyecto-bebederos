import { DataTypes } from 'sequelize'
export function defineTaskEvent(db) {
  const immutable = () => {
    throw Error('Los eventos de tareas son inmutables')
  }
  return db.define(
    'TaskEvent',
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      taskId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      farmId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      actorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      occurredAt: { type: DataTypes.DATE(3), allowNull: false },
      action: { type: DataTypes.STRING(50), allowNull: false },
      previousState: { type: DataTypes.STRING(50), allowNull: true },
      newState: { type: DataTypes.STRING(50), allowNull: false },
      previousWorkerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      newWorkerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      comment: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'TaskEvents',
      timestamps: false,
      validate: {
        reason() {
          if (this.action === 'reject' && !this.comment?.trim())
            throw Error('Motivo requerido')
        },
      },
      hooks: {
        beforeUpdate: immutable,
        beforeDestroy: immutable,
        beforeBulkUpdate: immutable,
        beforeBulkDestroy: immutable,
      },
    },
  )
}
