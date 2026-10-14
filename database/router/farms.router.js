import { Router } from 'express'
import { requireAccount, requireOwner } from '../middleware/authorization.js'
import { validate } from '../middleware/validate.js'
import { createFarmService } from '../services/farm.service.js'
import { farmSchema, farmPatchSchema, listSchema } from '../services/resource.schemas.js'
export function createFarmsRouter({ db, access, clock }) {
  const r = Router()
  const s = createFarmService(db, { clock })
  r.use(requireAccount(access))
  r.get('/', validate(listSchema, 'query'), async (req, res) =>
    res.json(await s.list(req.account, req.validated.query)),
  )
  r.post('/', requireOwner, validate(farmSchema), async (req, res) =>
    res.status(201).json(await s.create(req.account, req.validated.body)),
  )
  r.get('/:id', async (req, res) => res.json(await s.detail(req.account, req.params.id)))
  r.patch('/:id', requireOwner, validate(farmPatchSchema), async (req, res) =>
    res.json(await s.patch(req.account, req.params.id, req.validated.body)),
  )
  r.delete('/:id', requireOwner, async (req, res) => {
    await s.remove(req.account, req.params.id)
    res.status(204).end()
  })
  return r
}
