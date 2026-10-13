import { Router } from 'express'
import { ApiError } from '../middleware/errors.js'
import { validate } from '../middleware/validate.js'
import { requireAccount } from '../middleware/authorization.js'
import { previewQuerySchema, tokenSchemaBody } from '../services/auth.schemas.js'

// Preview público y aceptación explícita. Emisión, listado y retiro llegan en US5.
export function createInvitationAcceptanceRouter({ invitations, access, limiter }) {
  const router = Router()
  router.get('/preview', limiter, validate(previewQuerySchema, 'query'), async (req, res) => {
    res.set('Cache-Control', 'no-store')
    res.json(await invitations.preview(req.validated.query.token))
  })
  // Una cuenta dueño nunca acepta como peón: se rechaza sin cambiar su rol.
  router.post('/accept', limiter, requireAccount(access), (req, _res, next) => {
    next(req.account.role === 'worker' ? undefined : new ApiError(403, 'ROLE_INCOMPATIBLE'))
  }, validate(tokenSchemaBody), async (req, res) => {
    res.json(await invitations.accept(req.account, req.validated.body.token))
  })
  return router
}
