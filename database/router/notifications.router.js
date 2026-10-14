import { Router } from 'express'
import { z } from 'zod'
import { requireAccount } from '../middleware/authorization.js'
import { validate } from '../middleware/validate.js'
import { listSchema } from '../services/resource.schemas.js'
import { createAlertQueries } from '../services/alertQueries.service.js'
export function createNotificationsRouter(options) {
 const r=Router(), s=createAlertQueries(options.db,options)
 r.use(requireAccount(options.access))
 r.get('/',validate(listSchema,'query'),async(req,res)=>res.json(await s.list(req.account,req.validated.query,true)))
 r.post('/:id/read',validate(z.strictObject({})),async(req,res)=>{await s.read(req.account,req.params.id);res.sendStatus(204)})
 return r
}
