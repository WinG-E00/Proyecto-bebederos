import { beforeAll, afterAll, it, expect } from 'vitest'
import { openIdentityDatabase, insertAccount, email } from '../helpers/identityFixtures.js'
import { monitoringContext, farmBody, troughBody, animalBody, write, fixtureInsert } from '../helpers/monitoringFixtures.js'
import { submitSample } from '../../scripts/sample.js'
import { createWaterProcessing } from '../../services/waterProcessing.service.js'
import { createPositionProcessing } from '../../services/positionProcessing.service.js'
let db,c,f,g,other,t,a,task,worker2
beforeAll(async()=>{
 db=await openIdentityDatabase();c=await monitoringContext(db)
 f=(await write(c.owner,'post','/farms',farmBody)).body
 g=(await write(c.owner,'post','/farms',{...farmBody,name:'Segundo'})).body
 other=(await write(c.other,'post','/farms',{...farmBody,name:'Ajeno'})).body
 for(const farm of [f,g,other])await fixtureInsert(db,'Assignments',{farmId:farm.id,workerId:c.worker.account.id,createdAt:c.clock.now(),updatedAt:c.clock.now()})
 worker2=await insertAccount(db,{name:'Otro peón',address:email('history-worker2'),role:'worker'})
 await fixtureInsert(db,'Assignments',{farmId:f.id,workerId:worker2,createdAt:c.clock.now(),updatedAt:c.clock.now()})
 t=(await write(c.owner,'post',`/farms/${f.id}/troughs`,troughBody)).body
 a=(await write(c.owner,'post',`/farms/${f.id}/animals`,animalBody)).body
 task=(await write(c.owner,'post',`/farms/${f.id}/tasks`,{title:'Historial de tarea',description:'Revisar',deadline:c.clock.now().toISOString(),workerId:c.worker.account.id,troughId:t.id})).body
 await write(c.owner,'post',`/farms/${f.id}/tasks`,{title:'Tarea privada de otro peón',description:'Revisar',deadline:c.clock.now().toISOString(),workerId:worker2})
 await submitSample(db,'water',{resourceId:t.id,sourceKey:`hist:${t.id}:water`,percentage:19,measuredAt:c.clock.now().toISOString()},{environment:'test'})
 await submitSample(db,'animalPosition',{resourceId:a.id,sourceKey:`hist:${a.id}:gps`,latitude:-26,longitude:-59,measuredAt:c.clock.now().toISOString()},{environment:'test'})
 await createWaterProcessing(db,{clock:c.clock}).process();await createPositionProcessing(db,{clock:c.clock}).process()
},30000)
afterAll(async()=>{c?.identity.close();await db?.close()})
it('cinco tipos, fechas/actor, filtros y muestras fuera de orden conservadas',async()=>{
 const events=(await c.owner.agent.get(`/api/v1/history?farmId=${f.id}`).expect(200)).body.items
 expect([...new Set(events.map(e=>e.type))].sort()).toEqual(['alert','gps','task','visit','water'])
 expect(events.find(e=>e.type==='task')).toMatchObject({actorId:c.owner.account.id,actorName:'owner'})
 for(const type of ['water','gps','visit','alert','task'])expect((await c.owner.agent.get(`/api/v1/history?farmId=${f.id}&type=${type}`)).body.items.every(e=>e.type===type)).toBe(true)
 expect((await c.owner.agent.get(`/api/v1/history?farmId=${f.id}&from=2026-10-14T00:00:00Z`)).body.total).toBe(0)
 await submitSample(db,'water',{resourceId:t.id,sourceKey:`hist:${t.id}:old`,percentage:80,measuredAt:new Date(+c.clock.now()-10000).toISOString()},{environment:'test'})
 await createWaterProcessing(db,{clock:c.clock}).process()
 const water=(await c.owner.agent.get(`/api/v1/troughs/${t.id}/history?type=water`)).body
 expect(water.total).toBe(2);expect(water.items[1].details).toMatchObject({percentage:80,result:'historical'})
 expect((await c.worker.agent.get(`/api/v1/history?farmId=${f.id}`)).body.items.every(e=>e.type==='task'&&e.resourceId===task.id)).toBe(true)
 expect((await c.worker.agent.get(`/api/v1/animals/${a.id}/history`)).body.items.map(e=>e.type).sort()).toEqual(['gps','visit'])
 await c.other.agent.get(`/api/v1/animals/${a.id}/history`).expect(404)
})
it('agregados exactos por dueño/peón compartido; tareas ajenas excluidas',async()=>{
 const owner=(await c.owner.agent.get('/api/v1/dashboard')).body
 expect(owner).toMatchObject({farms:2,animals:1,troughs:1,workers:2,activeAlerts:1,water:{low:0,critical:1,missing:0},tasks:{pending:2,inProgress:0,validation:0,total:2}})
 expect(owner.map.map(m=>m.type).sort()).toEqual(['animal','trough'])
 const worker=(await c.worker.agent.get('/api/v1/dashboard')).body
 expect(worker).toMatchObject({farms:3,workers:null,tasks:{pending:1,total:1}})
 await write(c.worker,'post',`/tasks/${task.id}/actions`,{action:'start',expectedVersion:1}).expect(200)
 expect((await c.owner.agent.get(`/api/v1/dashboard?farmId=${f.id}`)).body.tasks).toMatchObject({pending:1,inProgress:1,total:2})
 await write(c.worker,'post',`/tasks/${task.id}/actions`,{action:'submit',expectedVersion:2}).expect(200)
 expect((await c.worker.agent.get('/api/v1/dashboard')).body.tasks).toMatchObject({pending:0,inProgress:0,validation:1,total:1})
})
it('cambios de responsable y retiro conservan historia del dueño; revocado pierde historial y agregados',async()=>{
 await write(c.owner,'post',`/tasks/${task.id}/actions`,{action:'assign',workerId:worker2,expectedVersion:3}).expect(200)
 expect((await c.worker.agent.get(`/api/v1/history?farmId=${f.id}`)).body.total).toBe(0)
 const taskHistory=(await c.owner.agent.get(`/api/v1/history?farmId=${f.id}&type=task`)).body.items
 expect(taskHistory.find(e=>e.details.action==='assign').details).toMatchObject({previousWorkerId:c.worker.account.id,newWorkerId:worker2})
 await write(c.owner,'post',`/tasks/${task.id}/actions`,{action:'approve',expectedVersion:4}).expect(200)
 await write(c.owner,'delete',`/troughs/${t.id}`).expect(204)
 await write(c.owner,'delete',`/animals/${a.id}`).expect(204)
 expect((await c.owner.agent.get('/api/v1/dashboard')).body).toMatchObject({animals:0,troughs:0,activeAlerts:0})
 expect((await c.owner.agent.get(`/api/v1/animals/${a.id}/history`)).body.total).toBe(2)
 await c.worker.agent.get(`/api/v1/animals/${a.id}/history`).expect(404)
 await write(c.owner,'put',`/team/${c.worker.account.id}/assignments`,{farmIds:[]}).expect(200)
 await c.worker.agent.get(`/api/v1/history?farmId=${f.id}`).expect(404)
 expect((await c.worker.agent.get('/api/v1/dashboard')).body.farms).toBe(1)
 expect((await c.worker.agent.get('/api/v1/farms?includeRetired=true')).body.items.map(x=>x.id)).toEqual([other.id])
})
