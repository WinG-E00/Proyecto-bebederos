import { beforeAll, afterAll, it, expect } from 'vitest'
import { openIdentityDatabase } from '../helpers/identityFixtures.js'
import { monitoringContext, farmBody, write, fixtureInsert } from '../helpers/monitoringFixtures.js'
let db,c,farms
beforeAll(async()=>{db=await openIdentityDatabase();c=await monitoringContext(db);farms=[];for(let i=0;i<2;i++){const f=(await write(c.owner,'post','/farms',farmBody)).body;farms.push(f);await fixtureInsert(db,'Assignments',{farmId:f.id,workerId:c.worker.account.id,createdAt:c.clock.now(),updatedAt:c.clock.now()})}},30000)
afterAll(async()=>{c?.identity.close();await db?.close()})
it('conteos vacíos reales, equipo único y alcance autorizado',async()=>{
 expect((await c.owner.agent.get('/api/v1/dashboard').expect(200)).body).toMatchObject({farms:2,workers:1,animals:0,troughs:0,water:{low:0,critical:0},activeAlerts:0,tasks:{pending:0,inProgress:0,validation:0,total:0}})
 expect((await c.worker.agent.get('/api/v1/dashboard').expect(200)).body).toMatchObject({farms:2,workers:null})
 await c.other.agent.get(`/api/v1/dashboard?farmId=${farms[0].id}`).expect(404)
 await c.owner.agent.get('/api/v1/dashboard?farmId=bad').expect(422)
})
