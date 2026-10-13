import { Op } from 'sequelize'
import { registerModels } from '../models/index.js'
import { ApiError } from '../middleware/errors.js'

const delays = [60000, 120000, 240000]
export function createMailWorker(db, { mail, transport, from, clock = { now: () => new Date() } }) {
  const { MailOutbox } = registerModels(db)
  async function expire() {
    await MailOutbox.update({ state: 'expired', encryptedPayload: null, errorCode: 'TOKEN_EXPIRED' }, {
      where: { expiresAt: { [Op.lte]: clock.now() }, state: { [Op.in]: ['pending', 'failed'] } },
    })
  }
  async function processNext() {
    await expire()
    return db.transaction(async (transaction) => {
      const item = await MailOutbox.findOne({
        where: { state: 'pending', nextAttemptAt: { [Op.lte]: clock.now() }, attempts: { [Op.lt]: 4 } },
        order: [['nextAttemptAt', 'ASC'], ['id', 'ASC']], transaction,
        lock: transaction.LOCK.UPDATE, skipLocked: true,
      })
      if (!item) return { processed: false }
      try {
        await mail.reference(item.kind, item.kind === 'invitation' ? item.invitationId : item.identityTokenId, transaction)
      } catch (error) {
        if (!(error instanceof ApiError)) throw error
        await item.update({ state: 'expired', encryptedPayload: null, errorCode: 'TOKEN_EXPIRED' }, { transaction })
        return { processed: true, state: 'expired' }
      }
      const attempts = item.attempts + 1
      try {
        const payload = mail.decrypt(item.encryptedPayload)
        if (!transport || !from) throw new Error('SMTP no configurado')
        // Mantener el bloqueo de fila durante SMTP evita doble envío concurrente.
        // SMTP no ofrece atomicidad con MySQL: un crash tras aceptación puede reenviar.
        const response = await transport.sendMail({ from, to: item.recipient, subject: item.subject, ...payload })
        if (!response?.accepted?.length || response.rejected?.includes(item.recipient)) throw new Error('SMTP no aceptó destinatario')
      } catch {
        const failed = attempts >= 4
        await item.update({
          attempts, state: failed ? 'failed' : 'pending', errorCode: 'SMTP_FAILED',
          nextAttemptAt: new Date(clock.now().getTime() + (delays[attempts - 1] ?? 0)),
        }, { transaction })
        if (item.invitationId && failed) await db.query("UPDATE Invitations SET deliveryState = 'Fallido', updatedAt = :now WHERE id = :id", {
          replacements: { id: item.invitationId, now: clock.now() }, transaction,
        })
        return { processed: true, state: failed ? 'failed' : 'pending', errorCode: 'SMTP_FAILED' }
      }
      // Un fallo SQL después de aceptación SMTP debe revertir la transacción y
      // retomar el pendiente; no se etiqueta como fallo del proveedor.
      await item.update({ attempts, state: 'sent', sentAt: clock.now(), encryptedPayload: null, errorCode: null }, { transaction })
      if (item.invitationId) await db.query("UPDATE Invitations SET deliveryState = 'Enviado', updatedAt = :now WHERE id = :id", {
        replacements: { id: item.invitationId, now: clock.now() }, transaction,
      })
      return { processed: true, state: 'sent' }
    })
  }
  return { processNext, expire }
}
