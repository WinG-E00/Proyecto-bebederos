import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { config, ownerSession, createFarm } from './monitoringHelpers.js'
import { insertAccount } from '../../../../database/tests/helpers/identityFixtures.js'
import { fixtureInsert } from '../../../../database/tests/helpers/monitoringFixtures.js'
import { submitSample } from '../../../../database/scripts/sample.js'
import { createMonitorWorker } from '../../../../database/workers/monitor.worker.js'
import { createWeatherService } from '../../../../database/services/weather.service.js'
test.setTimeout(120000)
test.skip(!config,'Requiere API real y MySQL de pruebas')
test('US9 paneles reales, cinco antecedentes, retiro y revocación',async({page,request,browser},testInfo)=>{
 await page.route('**/*.tile.openstreetmap.org/**',route=>route.abort())
 const db=await ownerSession(page,request);let context
 try {
  const f=await createFarm(page,'Campo historial')
  const address=`history-${randomUUID()}@test.invalid`, password='clave-de-prueba-10'
  const workerId=await insertAccount(db,{name:'Peón historial',address,role:'worker',password})
  await fixtureInsert(db,'Assignments',{farmId:f.id,workerId,createdAt:new Date(),updatedAt:new Date()})
  const {t,a,account}=await page.evaluate(async({farmId,workerId})=>{
   const {csrfToken}=await(await fetch('/api/v1/auth/csrf')).json()
   const post=async(path,body)=>(await(await fetch(`/api/v1${path}`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},body:JSON.stringify(body)})).json())
   const t=await post(`/farms/${farmId}/troughs`,{name:'Bebedero historial',capacityLiters:500,latitude:-26,longitude:-59})
   const a=await post(`/farms/${farmId}/animals`,{name:'Animal historial',species:'Bovino',breed:'Angus',ageYears:2,state:'Activo'})
   await post(`/farms/${farmId}/tasks`,{title:'Revisar historial',description:'Controlar',deadline:new Date(Date.now()+86400000).toISOString(),workerId})
   const {account}=await(await fetch('/api/v1/auth/me')).json()
   return {t,a,account}
  },{farmId:f.id,workerId})
  await submitSample(db,'water',{resourceId:t.id,sourceKey:`dashboard:${t.id}`,percentage:19,measuredAt:new Date().toISOString()},{environment:'test'})
  await submitSample(db,'animalPosition',{resourceId:a.id,sourceKey:`dashboard:${a.id}`,latitude:-26,longitude:-59,measuredAt:new Date().toISOString()},{environment:'test'})
  await createMonitorWorker(db).process()
  await createWeatherService(db,{provider:async()=>({current:{temperature_2m:23,relative_humidity_2m:60,weather_code:0,time:Date.now()/1000},daily:{time:[Date.now()/1000],precipitation_probability_max:[15]}})}).get(account,f.id)
  await page.goto(`/dashboard?farmId=${f.id}`)
  await expect(page.getByRole('heading',{name:'Tareas abiertas: 1'})).toBeVisible()
  await expect(page.getByRole('link',{name:'Animales 1',exact:true})).toBeVisible()
  await expect(page.getByRole('link',{name:'Agua Crítica 1',exact:true})).toBeVisible()
  await expect(page.getByText('23 °C · Despejado')).toBeVisible()
  await expect(page.getByText('Datos de ejemplo de la referencia.')).toHaveCount(0)
  await page.screenshot({path:testInfo.outputPath('dashboard-owner.png'),fullPage:true})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.goto(`/history?farmId=${f.id}`)
  for(const type of ['water','gps','visit','alert','task']){
   await page.getByLabel('Tipo de evento').selectOption(type)
   await expect(page.locator('main ol li').first()).toBeVisible()
  }
  await page.getByLabel('Tipo de evento').selectOption('')
  await page.screenshot({path:testInfo.outputPath('history.png'),fullPage:true})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  context=await browser.newContext({viewport:testInfo.project.use.viewport,isMobile:testInfo.project.use.isMobile,hasTouch:true})
  await context.route('**/*.tile.openstreetmap.org/**',route=>route.abort())
  const worker=await context.newPage()
  await worker.goto('http://127.0.0.1:5173/login')
  await worker.getByLabel('Correo electrónico').fill(address);await worker.getByLabel('Contraseña',{exact:true}).fill(password)
  await worker.getByRole('button',{name:'Iniciar sesión',exact:true}).click()
  await expect(worker).toHaveURL(/dashboard/)
  await expect(worker.getByRole('heading',{name:'Tareas abiertas: 1'})).toBeVisible()
  await expect(worker.getByRole('link',{name:'Historial',exact:true})).toHaveCount(0)
  await expect(worker.getByRole('link',{name:'Animales 1',exact:true})).toBeVisible()
  await worker.screenshot({path:testInfo.outputPath('dashboard-worker.png'),fullPage:true})
  expect(await worker.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await worker.goto(`http://127.0.0.1:5173/animals?farmId=${f.id}&id=${a.id}`)
  await worker.getByRole('button',{name:'Ver antecedentes'}).click()
  await expect(worker.getByRole('heading',{name:'Antecedentes de Animal historial'})).toBeVisible()
  await expect(worker.getByText('Visita estimada al bebedero #'+t.id+'. No acredita consumo.')).toBeVisible()
  await page.evaluate(async({workerId,tId})=>{
   const {csrfToken}=await(await fetch('/api/v1/auth/csrf')).json()
   await fetch(`/api/v1/team/${workerId}/assignments`,{method:'PUT',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},body:JSON.stringify({farmIds:[]})})
   await fetch(`/api/v1/troughs/${tId}`,{method:'DELETE',headers:{'X-CSRF-Token':csrfToken}})
  },{workerId,tId:t.id})
  await expect(worker.getByRole('heading',{name:'Antecedentes de Animal historial'})).toHaveCount(0,{timeout:20000})
  await page.getByLabel('Tipo de evento').selectOption('water')
  await expect(page.getByText('Agua: 19% · Crítico')).toBeVisible()
 }finally{await context?.close();await db.close()}
})
