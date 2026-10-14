import { beforeAll, afterAll, it, expect } from 'vitest'
import { openIdentityDatabase } from '../helpers/identityFixtures.js'
import { monitoringContext, farmBody, write, fixtureInsert } from '../helpers/monitoringFixtures.js'
let db,c,f,id
beforeAll(async()=>{
 db=await openIdentityDatabase();c=await monitoringContext(db)
 f=(await write(c.owner,'post','/farms',farmBody)).body
 await fixtureInsert(db,'Assignments',{farmId:f.id,workerId:c.worker.account.id,createdAt:c.clock.now(),updatedAt:c.clock.now()})
 await fixtureInsert(db,'Alerts',{farmId:f.id,resourceType:'trough',resourceId:1,conditionName:'water_missing',message:'Sin datos recibidos',generatedAt:c.clock.now(),activeKey:`test:${f.id}`})
 id=await fixtureInsert(db,'Notifications',{farmId:f.id,recipientId:c.worker.account.id,type:'task',message:'Revisar',occurredAt:c.clock.now()})
},30000)
afterAll(async()=>{c?.identity.close();await db?.close()})
it('filtra episodios y mensajes por destinatario y acceso actual; lectura no resuelve alerta',async()=>{
 for(const s of [c.owner,c.worker]) expect((await s.agent.get(`/api/v1/alerts?farmId=${f.id}`).expect(200)).body.total).toBe(1)
 await c.other.agent.get(`/api/v1/alerts?farmId=${f.id}`).expect(404)
 await c.owner.agent.get('/api/v1/alerts?active=foo').expect(422)
 await c.owner.agent.get('/api/v1/alerts?limit=101').expect(422)
 expect((await c.owner.agent.get('/api/v1/notifications').expect(200)).body.total).toBe(0)
 await write(c.owner,'post',`/notifications/${id}/read`,{}).expect(404)
 await write(c.worker,'post',`/notifications/${id}/read`,{}).expect(204)
 expect((await c.worker.agent.get('/api/v1/notifications')).body.items[0].readAt).toBeTruthy()
 expect((await c.worker.agent.get('/api/v1/alerts')).body.total).toBe(1)
 await write(c.owner,'put',`/team/${c.worker.account.id}/assignments`,{farmIds:[]}).expect(200)
 expect((await c.worker.agent.get('/api/v1/alerts')).body.total).toBe(0)
 await write(c.worker,'post',`/notifications/${id}/read`,{}).expect(404)
})
