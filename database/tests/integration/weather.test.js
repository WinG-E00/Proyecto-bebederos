import { beforeAll, afterAll, it, expect, vi } from 'vitest'
import { openIdentityDatabase } from '../helpers/identityFixtures.js'
import { monitoringContext, farmBody, write } from '../helpers/monitoringFixtures.js'
import { createWeatherService } from '../../services/weather.service.js'
let db,c,f,g,s,provider
beforeAll(async()=>{
 db=await openIdentityDatabase();c=await monitoringContext(db)
 f=(await write(c.owner,'post','/farms',farmBody)).body
 g=(await write(c.owner,'post','/farms',{...farmBody,latitude:-30})).body
 provider=vi.fn(async farm=>({current:{temperature_2m:farm.latitude,relative_humidity_2m:80,weather_code:3,time:+c.clock.now()/1000},daily:{time:[+c.clock.now()/1000],precipitation_probability_max:[65]}}))
 s=createWeatherService(db,{clock:c.clock,provider})
},30000)
afterAll(async()=>{c?.identity.close();await db?.close()})
it('consolida solicitudes, separa campo/ubicación y cachea exactamente 15 minutos',async()=>{
 const both=await Promise.all([s.get(c.owner.account,f.id),s.get(c.owner.account,f.id)])
 expect(provider).toHaveBeenCalledTimes(1);expect(both[0]).toEqual(both[1])
 expect(both[0]).toMatchObject({temperatureC:-26,rainProbabilityPercent:65,rainPeriod:'2026-10-13',timezone:f.timezone,stale:false})
 expect((await s.get(c.owner.account,g.id)).temperatureC).toBe(-30)
 await expect(s.get(c.other.account,f.id)).rejects.toMatchObject({status:404})
 c.clock.advance(899999);await s.get(c.owner.account,f.id);expect(provider).toHaveBeenCalledTimes(2)
 c.clock.advance(1);await s.get(c.owner.account,f.id);expect(provider).toHaveBeenCalledTimes(3)
 await write(c.owner,'patch',`/farms/${f.id}`,{latitude:-31}).expect(200)
 expect((await s.get(c.owner.account,f.id)).temperatureC).toBe(-31)
})
it('fallo conserva respuesta antigua; cambio de ubicación invalida y ausencia no inventa ceros',async()=>{
 c.clock.advance(900000);provider.mockRejectedValue(new Error('provider down'))
 expect(await s.get(c.owner.account,f.id)).toMatchObject({temperatureC:-31,stale:true})
 await write(c.owner,'patch',`/farms/${f.id}`,{longitude:-60}).expect(200)
 expect(await s.get(c.owner.account,f.id)).toEqual({unavailable:true})
})
it('una respuesta en vuelo no repuebla la caché de una ubicación cambiada',async()=>{
 let release,entered
 const started=new Promise(resolve=>{entered=resolve})
 const service=createWeatherService(db,{clock:c.clock,provider:()=>{entered();return new Promise(resolve=>{release=resolve})}})
 const pending=service.get(c.owner.account,f.id);await started
 await write(c.owner,'patch',`/farms/${f.id}`,{longitude:-61}).expect(200)
 release({current:{temperature_2m:20,relative_humidity_2m:80,weather_code:0,time:+c.clock.now()/1000},daily:{time:[+c.clock.now()/1000],precipitation_probability_max:[0]}})
 expect(await pending).toEqual({unavailable:true})
 const [rows]=await db.query('SELECT farmId FROM WeatherCaches WHERE farmId=:id',{replacements:{id:f.id}})
 expect(rows).toHaveLength(0)
})
