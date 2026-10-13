import bcrypt from 'bcrypt'
import { Op } from 'sequelize'
import { ApiError } from '../middleware/errors.js'
import { registerModels } from '../models/index.js'
import { serializeAccount } from '../models/Account.model.js'
import { TOKEN_TTL_MS, generateToken, hashToken } from '../models/IdentityToken.model.js'

export const DEFAULT_BCRYPT_ROUNDS = 12
const ACCEPTED = Object.freeze({ accepted: true })
const links = {
  verification: { path: '/verify', text: (url) => `Para activar tu cuenta de Proyecto Bebederos abrí este enlace dentro de las próximas 24 horas:\n\n${url}\n\nSi no creaste una cuenta, ignorá este mensaje.` },
  recovery: { path: '/reset', text: (url) => `Para elegir una nueva contraseña de Proyecto Bebederos abrí este enlace dentro de los próximos 30 minutos:\n\n${url}\n\nSi no lo pediste, ignorá este mensaje; tu contraseña no cambia.` },
}
const isUniqueViolation = (error) => error?.name === 'SequelizeUniqueConstraintError'

// Registro, sesión, verificación, recuperación y perfil (contracts/api.md, «Acceso y perfil»).
export function createAuthService(db, { mail, sessions, invitations, appUrl, clock = { now: () => new Date() }, bcryptRounds = DEFAULT_BCRYPT_ROUNDS }) {
  const { Account, IdentityToken } = registerModels(db)
  let timingHash
  // Comparar siempre contra un hash evita distinguir cuentas por el tiempo de respuesta.
  const fallbackHash = async () => (timingHash ??= await bcrypt.hash('cuenta-inexistente', bcryptRounds))

  // Emite un token, invalida los anteriores del mismo tipo y encola el correo en la misma transacción.
  async function issue(account, type, transaction) {
    const now = clock.now()
    await IdentityToken.update({ consumedAt: now }, { where: { accountId: account.id, type, consumedAt: null }, transaction })
    const { token, hash } = generateToken()
    const record = await IdentityToken.create({ accountId: account.id, type, tokenHash: hash, expiresAt: new Date(now.getTime() + TOKEN_TTL_MS[type]) }, { transaction })
    const url = new URL(links[type].path, appUrl)
    url.searchParams.set('token', token)
    await mail.enqueue({ kind: type, identityTokenId: record.id, payload: { text: links[type].text(url.toString()) } }, { transaction })
  }

  // Token vigente (vence exactamente al cumplirse el plazo), sin usar y bloqueado.
  async function consume(token, type, transaction) {
    const record = await IdentityToken.findOne({
      where: { tokenHash: hashToken(token), type, consumedAt: null, expiresAt: { [Op.gt]: clock.now() } },
      transaction, lock: transaction.LOCK.UPDATE,
    })
    if (!record) throw new ApiError(422, 'TOKEN_INVALID', { token: 'Enlace inválido, usado o vencido.' })
    await record.update({ consumedAt: clock.now() }, { transaction })
    return record
  }

  return {
    async register({ name, email, password, invitationToken }) {
      const passwordHash = await bcrypt.hash(password, bcryptRounds)
      // Peón: solo con invitación vigente del mismo correo; acredita el correo pero no da acceso.
      if (invitationToken) {
        try {
          return await db.transaction(async (transaction) => {
            await invitations.assertUsableForRegistration(invitationToken, email, { transaction })
            if (await Account.findOne({ where: { email }, transaction })) throw new ApiError(409, 'ACCOUNT_EXISTS')
            const account = await Account.create({ name, email, passwordHash, role: 'worker', emailVerifiedAt: clock.now() }, { transaction })
            return { status: 201, body: { account: serializeAccount(account), needsVerification: false } }
          })
        } catch (error) {
          if (isUniqueViolation(error)) throw new ApiError(409, 'ACCOUNT_EXISTS')
          throw error
        }
      }
      // Registro público: siempre dueño. Misma respuesta si el correo ya existe.
      try {
        await db.transaction(async (transaction) => {
          if (await Account.findOne({ where: { email }, transaction })) return
          const account = await Account.create({ name, email, passwordHash, role: 'owner' }, { transaction })
          await issue(account, 'verification', transaction)
        })
      } catch (error) { if (!isUniqueViolation(error)) throw error }
      return { status: 202, body: { account: null, needsVerification: true } }
    },

    async login({ email, password }) {
      const account = await Account.findOne({ where: { email } })
      const valid = await bcrypt.compare(password, account?.passwordHash ?? await fallbackHash())
      if (!account || !valid) throw new ApiError(401, 'INVALID_CREDENTIALS')
      if (!account.emailVerifiedAt) throw new ApiError(403, 'EMAIL_NOT_VERIFIED')
      return account
    },

    async verifyEmail({ token }) {
      await db.transaction(async (transaction) => {
        const record = await consume(token, 'verification', transaction)
        await Account.update({ emailVerifiedAt: clock.now() }, { where: { id: record.accountId, emailVerifiedAt: null }, transaction })
      })
    },

    async resendVerification({ email }) {
      await db.transaction(async (transaction) => {
        const account = await Account.findOne({ where: { email }, transaction, lock: transaction.LOCK.UPDATE })
        if (account && !account.emailVerifiedAt) await issue(account, 'verification', transaction)
      })
      return ACCEPTED
    },

    async forgotPassword({ email }) {
      await db.transaction(async (transaction) => {
        const account = await Account.findOne({ where: { email }, transaction, lock: transaction.LOCK.UPDATE })
        if (account) await issue(account, 'recovery', transaction)
      })
      return ACCEPTED
    },

    // Nueva contraseña: consume todos los enlaces de recuperación y cierra todas las sesiones.
    async resetPassword({ token, password }) {
      const passwordHash = await bcrypt.hash(password, bcryptRounds)
      await db.transaction(async (transaction) => {
        const record = await consume(token, 'recovery', transaction)
        const now = clock.now()
        await IdentityToken.update({ consumedAt: now }, { where: { accountId: record.accountId, type: 'recovery', consumedAt: null }, transaction })
        await Account.update({ passwordHash }, { where: { id: record.accountId }, transaction })
        // Abrir el enlace recibido en el correo también acredita ese correo.
        await Account.update({ emailVerifiedAt: now }, { where: { id: record.accountId, emailVerifiedAt: null }, transaction })
        await sessions.destroyAccountSessions(record.accountId, { transaction })
      })
    },

    async updateProfile(accountId, { name }) {
      const account = await Account.findByPk(accountId)
      if (!account) throw new ApiError(401, 'UNAUTHENTICATED')
      await account.update({ name })
      return serializeAccount(account)
    },
  }
}
