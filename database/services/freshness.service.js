import { select, update } from './monitoringSql.service.js'
import { evaluateResourceAlerts } from './alerts.service.js'
export async function evaluateFarmFreshness(db, farm, {transaction, now}) {
  if (farm.deletedAt) return
  const troughs = await select(db, `SELECT t.id,w.percentage,w.measuredAt FROM Troughs t LEFT JOIN TroughStates s ON s.troughId=t.id LEFT JOIN WaterReadings w ON w.id=s.lastReadingId WHERE t.farmId=:id AND t.deletedAt IS NULL`, {id:farm.id}, transaction)
  const animals = await select(db, `SELECT a.id,p.measuredAt FROM Animals a LEFT JOIN AnimalStates s ON s.animalId=a.id LEFT JOIN AnimalPositions p ON p.id=s.lastPositionId WHERE a.farmId=:id AND a.deletedAt IS NULL`, {id:farm.id}, transaction)
  for (const row of troughs) await evaluateResourceAlerts(db,farm,'trough',row.id,row,{transaction,now})
  for (const row of animals) await evaluateResourceAlerts(db,farm,'animal',row.id,row,{transaction,now})
  await update(db,'WorkerStates',`freshness:farm:${farm.id}`,{errorCode:null,lastSuccessfulCycleAt:now,updatedAt:now},transaction,'name')
}
export function createFreshnessService(db,{clock={now:()=>new Date()}}={}) {
  return { async process() {
    const farms = await select(db,'SELECT id FROM Farms WHERE deletedAt IS NULL ORDER BY id')
    for (const {id} of farms) await db.transaction(async transaction=>{
      const [farm] = await select(db,'SELECT * FROM Farms WHERE id=:id FOR UPDATE',{id},transaction)
      await evaluateFarmFreshness(db,farm,{transaction,now:clock.now()})
    })
  } }
}
