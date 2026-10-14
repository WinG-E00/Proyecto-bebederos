import { sqlValues } from './monitoringSql.service.js'
import { QueryTypes } from 'sequelize'
import { ApiError } from '../middleware/errors.js'
import { hashToken } from '../models/IdentityToken.model.js'
import { normalizeEmail } from '../models/Account.model.js'

// "Token único; siete días exactos." Emisión y administración llegan en US5; aquí solo
// se valida, previsualiza y acepta una invitación ya existente (fixture hasta entonces).
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{20,128}$/

export function createInvitationAcceptanceService(
  db,
  { clock = { now: () => new Date() } } = {},
) {
  async function find(token, { transaction, lock = false } = {}) {
    if (typeof token !== 'string' || !TOKEN_FORMAT.test(token)) return null
    const rows = await db.query(
      `SELECT id, ownerId, email, state, acceptedById, (expiresAt <= :now) AS expired
       FROM Invitations WHERE tokenHash = :hash${lock ? ' FOR UPDATE' : ''}`,
      {
        replacements: sqlValues({ now: clock.now(), hash: hashToken(token) }),
        type: QueryTypes.SELECT,
        transaction,
      },
    )
    const row = rows[0]
    if (!row) return null
    // Vence exactamente al cumplirse el plazo, aunque el registro siga «Pendiente».
    const state =
      row.state === 'Pendiente' && Number(row.expired) === 1
        ? 'Vencida'
        : row.state
    return {
      id: Number(row.id),
      ownerId: Number(row.ownerId),
      email: normalizeEmail(row.email),
      state,
      acceptedById: row.acceptedById == null ? null : Number(row.acceptedById),
    }
  }

  // Solo campos vigentes del emisor siguen incluidos.
  async function eligibleFarms(invitation, transaction) {
    const rows = await db.query(
      `SELECT f.id FROM InvitationFarms inf JOIN Farms f ON f.id = inf.farmId AND f.ownerId = inf.ownerId
       WHERE inf.invitationId = :id AND inf.active = TRUE AND f.deletedAt IS NULL ORDER BY f.id`,
      {
        replacements: { id: invitation.id },
        type: QueryTypes.SELECT,
        transaction,
      },
    )
    return rows.map((row) => Number(row.id))
  }

  async function markExpired(invitation, transaction) {
    await db.query(
      "UPDATE Invitations SET state = 'Vencida', updatedAt = :now WHERE id = :id AND state = 'Pendiente'",
      {
        replacements: sqlValues({ id: invitation.id, now: clock.now() }),
        transaction,
      },
    )
  }

  const reasons = {
    Aceptada: 'used',
    Retirada: 'withdrawn',
    Vencida: 'expired',
  }

  return {
    // Público: nunca revela dueño, correo ni campos. `reason` permite un mensaje concreto.
    async preview(token) {
      const invitation = await find(token)
      if (!invitation) return { valid: false, reason: 'invalid' }
      if (invitation.state !== 'Pendiente')
        return { valid: false, reason: reasons[invitation.state] ?? 'invalid' }
      if (!(await eligibleFarms(invitation)).length)
        return { valid: false, reason: 'no_farms' }
      return { valid: true }
    },

    // Registro de peón: el token acredita el correo, pero no concede asignaciones.
    async assertUsableForRegistration(token, email, { transaction }) {
      const invitation = await find(token, { transaction, lock: true })
      const usable =
        invitation?.state === 'Pendiente' &&
        invitation.email === email &&
        (await eligibleFarms(invitation, transaction)).length > 0
      if (!usable)
        throw new ApiError(422, 'INVITATION_INVALID', {
          invitationToken:
            'Invitación no válida para este correo, vencida o retirada.',
        })
    },

    // Aceptación explícita y transaccional por una cuenta peón del correo destinatario.
    async accept(account, token) {
      if (account.role !== 'worker') throw new ApiError(403, 'ROLE_FORBIDDEN')
      return db
        .transaction(async (transaction) => {
          const initial = await find(token, { transaction })
          if (!initial) throw new ApiError(404, 'INVITATION_NOT_FOUND')
          const ids = await eligibleFarms(initial, transaction)
          if (ids.length)
            await db.query(
              'SELECT id FROM Farms WHERE id IN (:ids) ORDER BY id FOR UPDATE',
              { replacements: { ids }, transaction },
            )
          const invitation = await find(token, { transaction, lock: true })
          if (!invitation) throw new ApiError(404, 'INVITATION_NOT_FOUND')
          if (invitation.email !== normalizeEmail(account.email))
            throw new ApiError(403, 'INVITATION_EMAIL_MISMATCH')
          if (invitation.state === 'Aceptada') {
            if (invitation.acceptedById !== Number(account.id))
              throw new ApiError(409, 'INVITATION_USED')
            // Repetir no duplica ni reactiva accesos revocados después de aceptar.
            const rows = await db.query(
              `SELECT a.farmId FROM Assignments a JOIN InvitationFarms inf ON inf.farmId = a.farmId AND inf.invitationId = :invitationId
             WHERE a.workerId = :workerId AND a.active = TRUE ORDER BY a.farmId`,
              {
                replacements: {
                  invitationId: invitation.id,
                  workerId: account.id,
                },
                type: QueryTypes.SELECT,
                transaction,
              },
            )
            return {
              accepted: true,
              farmIds: rows.map((row) => Number(row.farmId)),
            }
          }
          if (invitation.state === 'Retirada')
            throw new ApiError(409, 'INVITATION_WITHDRAWN')
          if (invitation.state === 'Vencida') {
            await markExpired(invitation, transaction)
            return { expired: true }
          }
          const farmIds = await eligibleFarms(invitation, transaction)
          if (!farmIds.length) throw new ApiError(409, 'INVITATION_NO_FARMS')
          const now = clock.now()
          for (const farmId of farmIds) {
            await db.query(
              `INSERT INTO Assignments (farmId, workerId, active, revokedAt, createdAt, updatedAt) VALUES (:farmId, :workerId, TRUE, NULL, :now, :now)
             ON DUPLICATE KEY UPDATE active = TRUE, revokedAt = NULL, updatedAt = VALUES(updatedAt)`,
              {
                replacements: sqlValues({ farmId, workerId: account.id, now }),
                transaction,
              },
            )
          }
          await db.query(
            "UPDATE Invitations SET state = 'Aceptada', acceptedById = :workerId, updatedAt = :now WHERE id = :id",
            {
              replacements: sqlValues({
                workerId: account.id,
                now,
                id: invitation.id,
              }),
              transaction,
            },
          )
          // El enlace recibido en el correo acredita ese correo.
          await db.query(
            'UPDATE Accounts SET emailVerifiedAt = COALESCE(emailVerifiedAt, :now), updatedAt = :now WHERE id = :id',
            {
              replacements: sqlValues({ now, id: account.id }),
              transaction,
            },
          )
          return { accepted: true, farmIds }
        })
        .then((result) => {
          // El cambio a «Vencida» se confirma antes de informar el rechazo.
          if (result.expired) throw new ApiError(409, 'INVITATION_EXPIRED')
          return result
        })
    },
  }
}
