import { Router } from 'express'
import { requireAccount } from '../middleware/authorization.js'
import { createWeatherService } from '../services/weather.service.js'
export function createWeatherRouter(options) {
 const r=Router(), s=createWeatherService(options.db,options)
 r.use(requireAccount(options.access))
 r.get('/farms/:id/weather',async(req,res)=>res.json(await s.get(req.account,req.params.id)))
 return r
}
