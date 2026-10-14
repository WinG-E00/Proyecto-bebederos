import { ApiError } from '../middleware/errors.js'
import { select, insert, update } from './monitoringSql.service.js'
import { generateToken } from '../models/IdentityToken.model.js'
import { createAccessService } from './access.service.js'
import { paginated, pagination } from './pagination.js'
import { iso } from './water.service.js'

export function createInvitationService(
  db,
  { mail, appUrl, clock = { now: () => new Date() } },
) {
  const access = createAccessService(db)
  async function own(account, id, transaction) {
    if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)))
      throw new ApiError(404, 'NOT_FOUND')
    const [row] = await select(
      db,
      'SELECT * FROM Invitations WHERE id=:id AND ownerId=:ownerId FOR UPDATE',
      { id, ownerId: account.id },
      transaction,
    )
    if (!row) throw new ApiError(404, 'NOT_FOUND')
    return row
  }
  async function serialize(row, transaction) {
    const farms = await select(
      db,
      'SELECT farmId FROM InvitationFarms WHERE invitationId=:id AND active=TRUE ORDER BY farmId',
      { id: row.id },
      transaction,
    )
    return {
      id: row.id,
      email: row.email,
      farmIds: farms.map((f) => f.farmId),
      state:
        row.state === 'Pendiente' && new Date(row.expiresAt) <= clock.now()
          ? 'Vencida'
          : row.state,
      deliveryState: row.deliveryState,
      issuedAt: iso(row.issuedAt),
      expiresAt: iso(row.expiresAt),
    }
  }
  async function list(a, query) {
    const p = pagination(query)
    const [count] = await select(
      db,
      'SELECT COUNT(*) total FROM Invitations WHERE ownerId=:ownerId',
      { ownerId: a.id },
    )
    const rows = await select(
      db,
      'SELECT * FROM Invitations WHERE ownerId=:ownerId ORDER BY id DESC LIMIT :limit OFFSET :offset',
      { ownerId: a.id, ...p },
    )
    return paginated(
      await Promise.all(rows.map((r) => serialize(r))),
      Number(count.total),
      p,
    )
  }
  async function create(a, body) {
    return db.transaction(async (transaction) => {
      // All farm locks precede invitation/outbox locks, in stable order.
      for (const id of [...body.farmIds].sort((a, b) => a - b))
        await access.farm(a, id, { transaction, lock: true })
      const [recipient] = await select(
        db,
        'SELECT role FROM Accounts WHERE email=:email',
        { email: body.email },
        transaction,
      )
      if (recipient?.role === 'owner')
        throw new ApiError(422, 'OWNER_RECIPIENT', {
          email: 'Una cuenta dueño no puede ingresar como peón.',
        })
      const now = clock.now()
      const { token, hash } = generateToken()
      const id = await insert(
        db,
        'Invitations',
        {
          ownerId: a.id,
          email: body.email,
          tokenHash: hash,
          issuedAt: now,
          expiresAt: new Date(+now + 7 * 86400000),
          state: 'Pendiente',
          deliveryState: 'Pendiente',
          createdAt: now,
          updatedAt: now,
        },
        transaction,
      )
      for (const farmId of body.farmIds)
        await insert(
          db,
          'InvitationFarms',
          { invitationId: id, farmId, ownerId: a.id, active: true },
          transaction,
        )
      const link = new URL('/invite', appUrl)
      link.searchParams.set('token', token)
      await mail.enqueue(
        {
          kind: 'invitation',
          invitationId: id,
          payload: {
            text: `Te invitaron a Proyecto Bebederos. Ingresá y aceptá la invitación: ${link.href}`,
          },
        },
        { transaction },
      )
      return serialize(await own(a, id, transaction), transaction)
    })
  }
  async function change(a, id, retry) {
    return db.transaction(async (transaction) => {
      // Mail worker locks outbox before invitation; keep that order here too.
      const items = await select(
        db,
        'SELECT * FROM MailOutbox WHERE invitationId=:id ORDER BY id FOR UPDATE',
        { id },
        transaction,
      )
      const row = await own(a, id, transaction)
      if (row.state !== 'Pendiente' || new Date(row.expiresAt) <= clock.now())
        throw new ApiError(409, 'INVITATION_UNAVAILABLE')
      const now = clock.now()
      if (retry) {
        if (row.deliveryState !== 'Fallido')
          throw new ApiError(409, 'MAIL_NOT_FAILED')
        const item = items.at(-1)
        if (!item?.encryptedPayload || item.state !== 'failed')
          throw new ApiError(409, 'MAIL_NOT_RETRYABLE')
        const farms = await select(
          db,
          'SELECT f.id FROM InvitationFarms inf JOIN Farms f ON f.id=inf.farmId WHERE inf.invitationId=:id AND inf.active=TRUE AND f.deletedAt IS NULL',
          { id },
          transaction,
        )
        if (!farms.length) throw new ApiError(409, 'INVITATION_NO_FARMS')
        await update(
          db,
          'MailOutbox',
          item.id,
          {
            state: 'pending',
            attempts: 0,
            nextAttemptAt: now,
            errorCode: null,
            updatedAt: now,
          },
          transaction,
        )
        await update(
          db,
          'Invitations',
          id,
          { deliveryState: 'Pendiente', updatedAt: now },
          transaction,
        )
        return serialize({ ...row, deliveryState: 'Pendiente' }, transaction)
      }
      await update(
        db,
        'Invitations',
        id,
        { state: 'Retirada', updatedAt: now },
        transaction,
      )
      for (const item of items)
        if (item.encryptedPayload)
          await update(
            db,
            'MailOutbox',
            item.id,
            {
              state: 'expired',
              encryptedPayload: null,
              errorCode: 'INVITATION_WITHDRAWN',
              updatedAt: now,
            },
            transaction,
          )
    })
  }
  return {
    list,
    create,
    retry: (a, id) => change(a, id, true),
    remove: (a, id) => change(a, id, false),
  }
}
