import { it, expect, vi } from 'vitest'
import { decodeWeather, localDay, cacheFresh, createWeatherProvider } from '../../services/weather.service.js'
const farm={latitude:-26,longitude:-59,timezone:'America/Argentina/Buenos_Aires'}
const now=new Date('2026-10-14T01:00:00Z')
const raw={current:{temperature_2m:0,relative_humidity_2m:50,weather_code:0,time:+now/1000},daily:{time:[+new Date('2026-10-13T03:00:00Z')/1000],precipitation_probability_max:[0]}}
it('usa día local, conserva cero real y rechaza respuesta incompleta',()=>{
 expect(localDay(now,farm.timezone)).toBe('2026-10-13')
 expect(decodeWeather(raw,farm,now)).toMatchObject({temperatureC:0,humidityPercent:50,condition:'Despejado',rainProbabilityPercent:0,rainPeriod:'2026-10-13',observedAt:now.toISOString()})
 expect(()=>decodeWeather({...raw,current:{...raw.current,temperature_2m:null}},farm,now)).toThrow()
 expect(()=>decodeWeather({...raw,daily:{time:[],precipitation_probability_max:[]}},farm,now)).toThrow()
 expect(cacheFresh(now,new Date(+now+899999))).toBe(true)
 expect(cacheFresh(now,new Date(+now+900000))).toBe(false)
})
it('adaptador comercial solo backend, sin clave no consulta; aborta a cinco segundos',async()=>{
 const fetchImpl=vi.fn(async()=>({ok:true,json:async()=>raw}))
 await expect(createWeatherProvider({fetchImpl})(farm)).rejects.toThrow()
 expect(fetchImpl).not.toHaveBeenCalled()
 await createWeatherProvider({apiKey:'test-private',fetchImpl})(farm)
 const url=fetchImpl.mock.calls[0][0]
 expect(url.hostname).toBe('customer-api.open-meteo.com')
 expect(url.searchParams.get('daily')).toBe('precipitation_probability_max')
 expect(url.searchParams.get('timeformat')).toBe('unixtime')
 vi.useFakeTimers()
 try {
  const pending=createWeatherProvider({apiKey:'test',fetchImpl:(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))))})(farm)
  const result=expect(pending).rejects.toThrow()
  await vi.advanceTimersByTimeAsync(5000);await result
 }finally{vi.useRealTimers()}
})
