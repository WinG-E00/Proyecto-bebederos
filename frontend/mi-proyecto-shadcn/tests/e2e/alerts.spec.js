import { test, expect } from '@playwright/test'
import { config, ownerSession, createFarm } from './monitoringHelpers.js'
import { submitSample } from '../../../../database/scripts/sample.js'
import { createMonitorWorker } from '../../../../database/workers/monitor.worker.js'
test.skip(!config,'Requiere API real y MySQL de pruebas')
test('US7 ausencia, actualización automática, resolución y vigencia',async({page,request},testInfo)=>{
 const db=await ownerSession(page,request)
 try {
  const f=await createFarm(page,'Campo alertas')
  const id=await page.evaluate(async farmId=>{
   const {csrfToken}=await(await fetch('/api/v1/auth/csrf')).json()
   return (await(await fetch(`/api/v1/farms/${farmId}/troughs`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},body:JSON.stringify({name:'Agua alertas',capacityLiters:100})})).json()).id
  },f.id)
  const worker=createMonitorWorker(db)
  await worker.process()
  await page.goto(`/alerts?farmId=${f.id}`)
  await expect(page.getByRole('heading',{name:'Sin datos recibidos de agua'})).toBeVisible()
  await submitSample(db,'water',{resourceId:id,sourceKey:`alert-e2e:${id}`,percentage:19,measuredAt:new Date(Date.now()-181*60000).toISOString()},{environment:'test'})
  await worker.process()
  await expect(page.getByRole('heading',{name:'Nivel de agua Crítico'})).toBeVisible({timeout:20000})
  await expect(page.getByRole('heading',{name:'Datos desactualizados de agua'})).toBeVisible()
  await page.getByLabel('Estado de alertas').selectOption('false')
  await expect(page.getByRole('heading',{name:'Sin datos recibidos de agua'})).toBeVisible()
  await page.screenshot({path:testInfo.outputPath('alerts.png'),fullPage:true})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.goto(`/troughs?farmId=${f.id}`)
  await expect(page.getByText('Agua: 19% · Crítico')).toBeVisible()
  await expect(page.getByText(/Datos desactualizados/)).toBeVisible()
 } finally {await db.close()}
})
