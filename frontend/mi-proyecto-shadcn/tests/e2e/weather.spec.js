import { test, expect } from '@playwright/test'
import { config, ownerSession, createFarm } from './monitoringHelpers.js'
import { createWeatherService } from '../../../../database/services/weather.service.js'
test.skip(!config,'Requiere API real y MySQL de pruebas')
test('US8 clima por ubicación, período local, fallback antiguo e indisponibilidad',async({page,request},testInfo)=>{
 const db=await ownerSession(page,request)
 try {
  const f=await createFarm(page,'Clima norte')
  const g=await createFarm(page,'Clima sur')
  const account=await page.evaluate(async()=>(await(await fetch('/api/v1/auth/me')).json()).account)
  const service=createWeatherService(db,{provider:async farm=>({current:{temperature_2m:farm.id===f.id?24:12,relative_humidity_2m:65,weather_code:3,time:Date.now()/1000},daily:{time:[Date.now()/1000],precipitation_probability_max:[35]}})})
  await service.get(account,f.id);await service.get(account,g.id)
  await page.goto('/weather')
  await expect(page.getByText('24 °C · Nublado')).toBeVisible()
  await expect(page.getByText('12 °C · Nublado')).toBeVisible()
  await expect(page.getByText(/Máxima del día/)).toHaveCount(2)
  await db.query('UPDATE WeatherCaches SET fetchedAt=DATE_SUB(fetchedAt,INTERVAL 16 MINUTE) WHERE farmId=:id',{replacements:{id:f.id}})
  await expect(page.getByText('Datos climáticos antiguos. No se pudo obtener información actual.')).toBeVisible({timeout:20000})
  await page.screenshot({path:testInfo.outputPath('weather.png'),fullPage:true})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.evaluate(async id=>{const {csrfToken}=await(await fetch('/api/v1/auth/csrf')).json();await fetch(`/api/v1/farms/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},body:JSON.stringify({latitude:-30})})},f.id)
  await expect(page.getByText('Información climática no disponible.')).toBeVisible({timeout:20000})
 }finally{await db.close()}
})
