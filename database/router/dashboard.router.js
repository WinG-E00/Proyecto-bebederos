import { Router } from 'express'
import { requireAccount } from '../middleware/authorization.js'
import { validate } from '../middleware/validate.js'
import { createDashboardService, dashboardSchema } from '../services/dashboard.service.js'
export function createDashboardRouter({db,access}) {
 const r=Router(),s=createDashboardService(db)
 r.use(requireAccount(access))
 r.get('/',validate(dashboardSchema,'query'),async(req,res)=>res.json(await s.get(req.account,req.validated.query)))
 return r
}
