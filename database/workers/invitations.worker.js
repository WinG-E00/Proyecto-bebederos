import { select, update, sqlValues } from '../services/monitoringSql.service.js'
export function createInvitationsWorker(
  db,
  { clock = { now: () => new Date() } } = {},
) {
  return {
    async process() {
      const candidates = await select(
        db,
        "SELECT m.id FROM MailOutbox m JOIN Invitations i ON i.id=m.invitationId WHERE m.encryptedPayload IS NOT NULL AND (i.state<>'Pendiente' OR i.expiresAt<=:now) ORDER BY m.id LIMIT 500",
        { now: clock.now() },
      )
      for (const { id } of candidates)
        await db.transaction(async (transaction) => {
          // Same order as SMTP/retry: lock the outbox row before its invitation.
          const [mail] = await select(
            db,
            'SELECT * FROM MailOutbox WHERE id=:id FOR UPDATE',
            { id },
            transaction,
          )
          if (!mail?.encryptedPayload) return
          const [invitation] = await select(
            db,
            'SELECT state,expiresAt FROM Invitations WHERE id=:id FOR UPDATE',
            { id: mail.invitationId },
            transaction,
          )
          if (
            invitation.state === 'Pendiente' &&
            new Date(invitation.expiresAt) > clock.now()
          )
            return
          await update(
            db,
            'MailOutbox',
            id,
            {
              state: 'expired',
              encryptedPayload: null,
              errorCode: 'INVITATION_UNAVAILABLE',
              updatedAt: clock.now(),
            },
            transaction,
          )
        })
      // No outbox locks remain while expiring invitations without queued mail.
      await db.query(
        "UPDATE Invitations SET state='Vencida',updatedAt=:now WHERE state='Pendiente' AND expiresAt<=:now",
        { replacements: sqlValues({ now: clock.now() }) },
      )
    },
  }
}
