import { z } from 'zod'
import { createAccessService } from './access.service.js'
import { select } from './monitoringSql.service.js'
import { createMapService } from './map.service.js'
export const dashboardSchema=z.strictObject({farmId:z.string().regex(/^[1-9]\d*$/).optional()})
export function createDashboardService(db) {
 const access=createAccessService(db),map=createMapService(db)
 return {async get(account,query={}){
  let ids=await access.farmIds(account)
  if(query.farmId){await access.farm(account,query.farmId);ids=[Number(query.farmId)]}
  const summary={farms:ids.length,animals:0,troughs:0,workers:account.role==='owner'?0:null,water:{low:0,critical:0,missing:0},activeAlerts:0,tasks:{pending:0,inProgress:0,validation:0,total:0},map:[]}
  if(!ids.length)return summary
  const v={ids,accountId:account.id}
  const [counts]=await select(db,`SELECT
   (SELECT COUNT(*) FROM Animals WHERE farmId IN (:ids) AND deletedAt IS NULL) animals,
   (SELECT COUNT(*) FROM Troughs WHERE farmId IN (:ids) AND deletedAt IS NULL) troughs,
   (SELECT COUNT(DISTINCT workerId) FROM Assignments WHERE farmId IN (:ids) AND active=TRUE) workers,
   (SELECT COUNT(*) FROM Alerts WHERE farmId IN (:ids) AND resolvedAt IS NULL) activeAlerts`,v)
  for(const key of ['animals','troughs','activeAlerts'])summary[key]=Number(counts[key])
  if(account.role==='owner')summary.workers=Number(counts.workers)
  const [water]=await select(db,`SELECT SUM(w.percentage BETWEEN 20 AND 50) low,SUM(w.percentage<20) critical,SUM(w.id IS NULL) missing FROM Troughs t LEFT JOIN TroughStates s ON s.troughId=t.id LEFT JOIN WaterReadings w ON w.id=s.lastReadingId WHERE t.farmId IN (:ids) AND t.deletedAt IS NULL`,v)
  for(const key of Object.keys(summary.water))summary.water[key]=Number(water[key]??0)
  const tasks=await select(db,`SELECT state,COUNT(*) total FROM Tasks WHERE farmId IN (:ids) AND state<>'Completada' ${account.role==='worker'?'AND workerId=:accountId':''} GROUP BY state`,v)
  const names={'Pendiente':'pending','En progreso':'inProgress','Pendiente de validación':'validation'}
  for(const row of tasks){summary.tasks[names[row.state]]=Number(row.total);summary.tasks.total+=Number(row.total)}
  summary.map=await map.list(account,query)
  return summary
 }}
}
