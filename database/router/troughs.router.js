import { Router } from 'express'
import { requireAccount, requireOwner } from '../middleware/authorization.js'
import { validate } from '../middleware/validate.js'
import { troughSchema, listSchema } from '../services/resource.schemas.js'
import { createTroughService } from '../services/trough.service.js'
export function createTroughsRouter({ db, access, clock }) {
  const r = Router()
  const s = createTroughService(db, { clock })
  r.use(requireAccount(access))
  r.get('/troughs', validate(listSchema, 'query'), async (req, res) =>
    res.json(await s.list(req.account, req.validated.query)),
  )
  r.get('/troughs/:id', async (req, res) => res.json(await s.detail(req.account, req.params.id)))
  r.post('/farms/:id/troughs', requireOwner, validate(troughSchema), async (req, res) =>
    res.status(201).json(await s.create(req.account, req.params.id, req.validated.body)),
  )
  r.delete('/troughs/:id', requireOwner, async (req, res) => {
    await s.remove(req.account, req.params.id)
    res.status(204).end()
  })
  return r
}
