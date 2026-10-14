import { identityLimiter } from '../middleware/security.js'
import { Router } from 'express'
import { requireAccount, requireOwner } from '../middleware/authorization.js'
import { validate } from '../middleware/validate.js'
import { invitationSchema, pageSchema } from '../services/team.schemas.js'
import { createInvitationService } from '../services/invitation.service.js'
import { z } from 'zod'
export function createInvitationsRouter({ db, access, clock, mail, appUrl }) {
  const limiter = identityLimiter()
  const r = Router(),
    s = createInvitationService(db, { clock, mail, appUrl })
  r.use(requireAccount(access), requireOwner)
  r.get('/', validate(pageSchema, 'query'), async (req, res) =>
    res.json(await s.list(req.account, req.validated.query)),
  )
  r.post('/', limiter, validate(invitationSchema), async (req, res) =>
    res.status(201).json(await s.create(req.account, req.validated.body)),
  )
  r.post(
    '/:id/retry',
    limiter,
    validate(z.strictObject({})),
    async (req, res) => res.json(await s.retry(req.account, req.params.id)),
  )
  r.delete('/:id', async (req, res) => {
    await s.remove(req.account, req.params.id)
    res.status(204).end()
  })
  return r
}
