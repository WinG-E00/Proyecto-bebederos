import { Router } from 'express'
import { requireAccount, requireOwner } from '../middleware/authorization.js'
import { validate } from '../middleware/validate.js'
import { farmIdsSchema, pageSchema } from '../services/team.schemas.js'
import { createTeamService } from '../services/team.service.js'
export function createTeamRouter({ db, access, clock }) {
  const r = Router(),
    s = createTeamService(db, { clock })
  r.use(requireAccount(access), requireOwner)
  r.get('/', validate(pageSchema, 'query'), async (req, res) =>
    res.json(await s.list(req.account, req.validated.query)),
  )
  r.put('/:workerId/assignments', validate(farmIdsSchema), async (req, res) =>
    res.json(
      await s.replace(req.account, req.params.workerId, req.validated.body),
    ),
  )
  return r
}
