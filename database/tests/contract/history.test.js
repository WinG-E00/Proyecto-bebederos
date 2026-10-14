import { beforeAll, afterAll, it, expect } from 'vitest'
import { openIdentityDatabase } from '../helpers/identityFixtures.js'
import { monitoringContext, farmBody, troughBody, write } from '../helpers/monitoringFixtures.js'
import { submitSample } from '../../scripts/sample.js'
import { createWaterProcessing } from '../../services/waterProcessing.service.js'
let db,c,f,t
beforeAll(async()=>{db=await openIdentityDatabase();c=await monitoringContext(db);f=(await write(c.owner,'post','/farms',farmBody)).body;t=(await write(c.owner,'post',`/farms/${f.id}/troughs`,troughBody)).body;await submitSample(db,'water',{resourceId:t.id,sourceKey:`history:${t.id}`,percentage:50,measuredAt:c.clock.now().toISOString()},{environment:'test'});await createWaterProcessing(db,{clock:c.clock}).process()},30000)
afterAll(async()=>{c?.identity.close();await db?.close()})
it('historial filtrado, paginado y dueño conserva retirados; terceros no acceden',async()=>{
 const r=await c.owner.agent.get(`/api/v1/history?farmId=${f.id}&type=water&limit=1`).expect(200)
 expect(r.body).toMatchObject({total:1,page:1,limit:1});expect(r.body.items[0]).toMatchObject({resourceId:t.id,type:'water',farmName:f.name})
 await c.other.agent.get(`/api/v1/history?farmId=${f.id}`).expect(404)
 for(const query of ['type=secret','from=invalid','limit=101','from=2026-10-14T00:00:00Z&to=2026-10-13T00:00:00Z'])await c.owner.agent.get(`/api/v1/history?${query}`).expect(422)
 await write(c.owner,'delete',`/troughs/${t.id}`).expect(204);await write(c.owner,'delete',`/farms/${f.id}`).expect(204)
 expect((await c.owner.agent.get(`/api/v1/troughs/${t.id}/history`).expect(200)).body.items.some(e=>e.type==='water')).toBe(true)
 await c.other.agent.get(`/api/v1/troughs/${t.id}/history`).expect(404)
 await c.owner.agent.get(`/api/v1/history?farmId=${f.id}`).expect(200)
})
