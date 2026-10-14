import { Router } from 'express'
import { requireAccount } from '../middleware/authorization.js'
import { validate } from '../middleware/validate.js'
import { createHistoryService, historySchema } from '../services/history.service.js'
export function createHistoryRouter({db,access}) {
 const r=Router(),s=createHistoryService(db)
 r.use(requireAccount(access))
 r.get('/history',validate(historySchema,'query'),async(req,res)=>res.json(await s.list(req.account,req.validated.query)))
 for(const [path,type] of [['troughs','trough'],['animals','animal']])r.get(`/${path}/:id/history`,validate(historySchema,'query'),async(req,res)=>res.json(await s.list(req.account,req.validated.query,{type,id:req.params.id})))
 return r
}
