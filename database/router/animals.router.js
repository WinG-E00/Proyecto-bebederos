import { Router } from 'express'
import { requireAccount, requireOwner } from '../middleware/authorization.js'
import { validate } from '../middleware/validate.js'
import { animalSchema, animalPatchSchema, listSchema } from '../services/resource.schemas.js'
import { createAnimalService } from '../services/animal.service.js'
export function createAnimalsRouter({ db, access, clock }) {
  const r = Router()
  const s = createAnimalService(db, { clock })
  r.use(requireAccount(access))
  r.get('/animals', validate(listSchema, 'query'), async (req, res) =>
    res.json(await s.list(req.account, req.validated.query)),
  )
  r.get('/animals/:id', async (req, res) => res.json(await s.detail(req.account, req.params.id)))
  r.post('/farms/:id/animals', requireOwner, validate(animalSchema), async (req, res) =>
    res.status(201).json(await s.create(req.account, req.params.id, req.validated.body)),
  )
  r.patch('/animals/:id', requireOwner, validate(animalPatchSchema), async (req, res) =>
    res.json(await s.patch(req.account, req.params.id, req.validated.body)),
  )
  r.delete('/animals/:id', requireOwner, async (req, res) => {
    await s.remove(req.account, req.params.id)
    res.status(204).end()
  })
  return r
}
