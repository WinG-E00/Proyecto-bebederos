import { Router } from 'express'
import { requireAccount } from '../middleware/authorization.js'
import { validate } from '../middleware/validate.js'
import { listSchema } from '../services/resource.schemas.js'
import { createMapService } from '../services/map.service.js'
export function createMapRouter({ db, access }) {
  const r = Router()
  const s = createMapService(db)
  r.get('/', requireAccount(access), validate(listSchema, 'query'), async (req, res) =>
    res.json(await s.list(req.account, req.validated.query)),
  )
  return r
}
