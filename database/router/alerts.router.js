import { Router } from 'express'
import { z } from 'zod'
import { requireAccount } from '../middleware/authorization.js'
import { validate } from '../middleware/validate.js'
import { listSchema } from '../services/resource.schemas.js'
import { createAlertQueries } from '../services/alertQueries.service.js'
export function createAlertsRouter(options) {
 const r=Router(), s=createAlertQueries(options.db,options)
 r.use(requireAccount(options.access))
 r.get('/',validate(listSchema.extend({active:z.enum(['true','false']).optional()}),'query'),async(req,res)=>res.json(await s.list(req.account,req.validated.query)))
 return r
}
