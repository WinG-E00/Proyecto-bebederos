import { beforeAll, afterAll, it, expect } from 'vitest'
import { openIdentityDatabase } from '../helpers/identityFixtures.js'
import { monitoringContext, farmBody, write, fixtureInsert } from '../helpers/monitoringFixtures.js'
let db,c,f
beforeAll(async()=>{db=await openIdentityDatabase();c=await monitoringContext(db);f=(await write(c.owner,'post','/farms',farmBody)).body},30000)
afterAll(async()=>{c?.identity.close();await db?.close()})
it('clima exige acceso actual y ausencia no inventa valores ni filtra claves',async()=>{
 expect((await c.owner.agent.get(`/api/v1/farms/${f.id}/weather`).expect(200)).body).toEqual({unavailable:true})
 await c.other.agent.get(`/api/v1/farms/${f.id}/weather`).expect(404)
 await c.worker.agent.get(`/api/v1/farms/${f.id}/weather`).expect(404)
 await fixtureInsert(db,'Assignments',{farmId:f.id,workerId:c.worker.account.id,createdAt:c.clock.now(),updatedAt:c.clock.now()})
 await c.worker.agent.get(`/api/v1/farms/${f.id}/weather`).expect(200)
 await write(c.owner,'put',`/team/${c.worker.account.id}/assignments`,{farmIds:[]})
 await c.worker.agent.get(`/api/v1/farms/${f.id}/weather`).expect(404)
})
