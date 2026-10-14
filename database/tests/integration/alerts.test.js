import { beforeAll, afterAll, it, expect } from 'vitest'
import { openIdentityDatabase } from '../helpers/identityFixtures.js'
import { monitoringContext, farmBody, troughBody, animalBody, write } from '../helpers/monitoringFixtures.js'
import { submitSample } from '../../scripts/sample.js'
import { createMonitorWorker } from '../../workers/monitor.worker.js'
let db,c,f,t,a
beforeAll(async()=>{
 db=await openIdentityDatabase();c=await monitoringContext(db)
 f=(await write(c.owner,'post','/farms',farmBody)).body
 t=(await write(c.owner,'post',`/farms/${f.id}/troughs`,troughBody)).body
 a=(await write(c.owner,'post',`/farms/${f.id}/animals`,animalBody)).body
},30000)
afterAll(async()=>{c?.identity.close();await db?.close()})
const worker=()=>createMonitorWorker(db,{clock:c.clock})
const alerts=async(active=true)=>(await c.owner.agent.get(`/api/v1/alerts?farmId=${f.id}&active=${active}`)).body.items
it('ausencia, varios workers y reinicio no duplican episodios',async()=>{
 await Promise.all([worker().process(),worker().process()])
 expect((await alerts()).map(x=>x.conditionName).sort()).toEqual(['gps_missing','water_missing'])
 await worker().process();expect(await alerts()).toHaveLength(2)
},30000)
it('preserva Bajo→Crítico→Normal en un lote y resuelve ausencias',async()=>{
 for(const [i,percentage] of [20,19,51].entries()) await submitSample(db,'water',{resourceId:t.id,sourceKey:`alerts:${t.id}:${i}`,percentage,measuredAt:new Date(+c.clock.now()-2000+i*1000).toISOString()},{environment:'test'})
 await submitSample(db,'animalPosition',{resourceId:a.id,sourceKey:`alerts:${a.id}:gps`,latitude:-26,longitude:-59,measuredAt:c.clock.now().toISOString()},{environment:'test'})
 await worker().process();expect(await alerts()).toHaveLength(0)
 expect((await alerts(false)).map(x=>x.conditionName).sort()).toEqual(['gps_missing','water_critical','water_low','water_missing'])
},30000)
it('límite exacto, cambio inmediato independiente y recuperación del agua no recupera GPS',async()=>{
 c.clock.advance(180*60000);await worker().process();expect(await alerts()).toHaveLength(0)
 c.clock.advance(1);await worker().process();expect((await alerts()).map(x=>x.conditionName).sort()).toEqual(['gps_stale','water_stale'])
 await write(c.owner,'patch',`/farms/${f.id}`,{staleMinutes:181}).expect(200);expect(await alerts()).toHaveLength(0)
 await write(c.owner,'patch',`/farms/${f.id}`,{staleMinutes:180}).expect(200);expect(await alerts()).toHaveLength(2)
 await submitSample(db,'water',{resourceId:t.id,sourceKey:`alerts:${t.id}:recover`,percentage:0,measuredAt:c.clock.now().toISOString()},{environment:'test'})
 await worker().process();expect((await alerts()).map(x=>x.conditionName).sort()).toEqual(['gps_stale','water_critical'])
 await write(c.owner,'delete',`/troughs/${t.id}`).expect(204)
 await write(c.owner,'delete',`/animals/${a.id}`).expect(204)
 await worker().process();expect(await alerts()).toHaveLength(0)
},30000)
