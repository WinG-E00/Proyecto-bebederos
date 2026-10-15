import { createAccessService } from './access.service.js'
import { select, sqlDate } from './monitoringSql.service.js'
import { errorSummary, silentLogger } from './logger.js'
const codes = {0:'Despejado',1:'Mayormente despejado',2:'Parcialmente nublado',3:'Nublado',45:'Niebla',48:'Niebla con escarcha',51:'Llovizna leve',53:'Llovizna',55:'Llovizna intensa',56:'Llovizna helada',57:'Llovizna helada intensa',61:'Lluvia leve',63:'Lluvia',65:'Lluvia intensa',66:'Lluvia helada',67:'Lluvia helada intensa',71:'Nieve leve',73:'Nieve',75:'Nieve intensa',77:'Granos de nieve',80:'Chaparrones leves',81:'Chaparrones',82:'Chaparrones intensos',85:'Chubascos de nieve',86:'Chubascos de nieve intensos',95:'Tormenta',96:'Tormenta con granizo',99:'Tormenta con granizo intenso'}
export const localDay=(date,timezone)=>new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
export const cacheFresh=(fetchedAt,now)=>+now-new Date(fetchedAt)>=0 && +now-new Date(fetchedAt)<15*60000
const location=f=>({latitude:f.latitude,longitude:f.longitude,timezone:f.timezone})
const sameLocation=(a,b)=>a.latitude===b.latitude&&a.longitude===b.longitude&&a.timezone===b.timezone
export function decodeWeather(raw,farm,now) {
 const c=raw?.current,d=raw?.daily, day=localDay(now,farm.timezone)
 const index=d?.time?.findIndex(t=>typeof t==='number'&&localDay(new Date(t*1000),farm.timezone)===day)??-1
 const rain=d?.precipitation_probability_max?.[index]
 if(!Number.isFinite(c?.temperature_2m)||!Number.isFinite(c?.relative_humidity_2m)||c.relative_humidity_2m<0||c.relative_humidity_2m>100||!codes[c?.weather_code]||!Number.isFinite(c?.time)||!Number.isFinite(rain)||rain<0||rain>100)throw new Error('WEATHER_INVALID')
 return {temperatureC:c.temperature_2m,humidityPercent:c.relative_humidity_2m,condition:codes[c.weather_code],rainProbabilityPercent:rain,rainPeriod:day,timezone:farm.timezone,observedAt:new Date(c.time*1000).toISOString(),source:'Open-Meteo',model:'best_match'}
}
export function createWeatherProvider({url='https://customer-api.open-meteo.com/v1/forecast',apiKey,fetchImpl=fetch}={}) {
 return async farm=>{
  if(!apiKey)throw new Error('WEATHER_NOT_CONFIGURED')
  const target=new URL(url)
  if(target.protocol!=='https:'||target.username||target.password)throw new Error('WEATHER_CONFIG_INVALID')
  for(const [key,value] of Object.entries({latitude:farm.latitude,longitude:farm.longitude,timezone:farm.timezone,current:'temperature_2m,relative_humidity_2m,weather_code',daily:'precipitation_probability_max',forecast_days:1,timeformat:'unixtime',models:'best_match',apikey:apiKey}))target.searchParams.set(key,value)
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000)
  try {const response=await fetchImpl(target,{signal:controller.signal});if(!response.ok)throw new Error('WEATHER_PROVIDER_FAILED');return await response.json()}
  finally{clearTimeout(timer)}
 }
}
export function createWeatherService(db,{clock={now:()=>new Date()},provider=createWeatherProvider(),logger=silentLogger}={}) {
 const access=createAccessService(db), pending=new Map()
 async function fetchField(farm) {
  const loc=location(farm), now=clock.now()
  const [cache]=await select(db,'SELECT * FROM WeatherCaches WHERE farmId=:id',{id:farm.id})
  const previous=cache&&sameLocation(cache.queriedLocation,loc)?cache:null
  if(previous&&cacheFresh(previous.fetchedAt,now)&&previous.data.rainPeriod===localDay(now,farm.timezone))return {...previous.data,fetchedAt:new Date(previous.fetchedAt).toISOString(),stale:false}
  try {
   const data=decodeWeather(await provider(farm),farm,clock.now()), fetchedAt=clock.now()
   const saved=await db.transaction(async transaction=>{
    const [current]=await select(db,'SELECT * FROM Farms WHERE id=:id FOR UPDATE',{id:farm.id},transaction)
    if(current.deletedAt||!sameLocation(current,loc))return false
    await db.query('INSERT INTO WeatherCaches (farmId,queriedLocation,data,fetchedAt) VALUES (:id,:loc,:data,:date) ON DUPLICATE KEY UPDATE queriedLocation=VALUES(queriedLocation),data=VALUES(data),fetchedAt=VALUES(fetchedAt)',{replacements:{id:farm.id,loc:JSON.stringify(loc),data:JSON.stringify(data),date:sqlDate(fetchedAt)},transaction})
    return true
   })
   return saved?{...data,fetchedAt:fetchedAt.toISOString(),stale:false}:{unavailable:true}
  }catch(error){
   // Timeout, HTTP o respuesta incompleta del proveedor: sin URL, clave ni cuerpo.
   logger.warn('weather.refresh_failed',{farmId:farm.id,fallback:previous?'stale':'unavailable',...errorSummary(error)})
   return previous?{...previous.data,fetchedAt:new Date(previous.fetchedAt).toISOString(),stale:true}:{unavailable:true}}
 }
 return {async get(account,id){
  const farm=await access.farm(account,id), key=JSON.stringify([farm.id,location(farm)])
  if(!pending.has(key))pending.set(key,fetchField(farm).finally(()=>pending.delete(key)))
  const result=await pending.get(key)
  // Recheck access/location after provider latency and concurrent edits/revocations.
  const current=await access.farm(account,id)
  return sameLocation(farm,current)?result:{unavailable:true}
 }}
}
