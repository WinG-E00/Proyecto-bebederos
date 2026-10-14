import { insert } from './monitoringSql.service.js'
export async function writeNotification(db, values, { transaction }) {
  if (!transaction || transaction.finished || transaction.sequelize !== db)
    throw Error('Notificar exige una transacción activa')
  return insert(db, 'Notifications', { ...values, readAt: null }, transaction)
}
