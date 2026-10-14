import { z } from 'zod'
import { createAccessService } from './access.service.js'
import { select } from './monitoringSql.service.js'
import { pagination, paginated } from './pagination.js'
import { listSchema } from './resource.schemas.js'
export const historySchema=listSchema.extend({
 type:z.enum(['water','gps','visit','alert','task','retirement']).optional(),
 from:z.iso.datetime({offset:true}).optional(), to:z.iso.datetime({offset:true}).optional(),
}).refine(q=>!q.from||!q.to||new Date(q.from)<=new Date(q.to),{message:'El inicio debe ser anterior al fin',path:['to']})
const eventResource=`CASE WHEN e.type='water' THEN 'trough' WHEN e.type='visit' THEN 'animal' WHEN e.type='task' THEN 'task' WHEN e.type='alert' THEN al.resourceType ELSE JSON_UNQUOTE(JSON_EXTRACT(e.details,'$.resourceType')) END`
export function createHistoryService(db) {
 const access=createAccessService(db)
 return {async list(account,query={},resource){
  const p=pagination(query),values={accountId:account.id,...p}, conditions=[]
  if(query.farmId){await access.farm(account,query.farmId,{includeRetired:true});conditions.push('e.farmId=:farmId');values.farmId=Number(query.farmId)}
  if(resource){
   await access.resource(account,resource.type,resource.id,{includeRetired:true})
   conditions.push('e.resourceId=:resourceId',`${eventResource}=:resourceType`)
   conditions.push(resource.type==='trough'?"e.type IN ('water','alert')":"e.type IN ('gps','visit')")
   values.resourceId=Number(resource.id);values.resourceType=resource.type
  }
  if(account.role==='owner')conditions.push('f.ownerId=:accountId')
  else {
   conditions.push('f.deletedAt IS NULL AND EXISTS (SELECT 1 FROM Assignments a WHERE a.farmId=f.id AND a.workerId=:accountId AND a.active=TRUE)')
   if(!resource)conditions.push("e.type='task' AND EXISTS (SELECT 1 FROM Tasks t WHERE t.id=e.resourceId AND t.farmId=e.farmId AND t.workerId=:accountId)")
  }
  if(query.type){conditions.push('e.type=:type');values.type=query.type}
  if(query.from){conditions.push('e.occurredAt>=:from');values.from=new Date(query.from)}
  if(query.to){conditions.push('e.occurredAt<=:to');values.to=new Date(query.to)}
  const base=`FROM HistoryEvents e JOIN Farms f ON f.id=e.farmId LEFT JOIN Alerts al ON e.type='alert' AND al.id=JSON_UNQUOTE(JSON_EXTRACT(e.details,'$.alertId')) AND al.farmId=e.farmId`
  const where=conditions.join(' AND ')
  const [count]=await select(db,`SELECT COUNT(*) total ${base} WHERE ${where}`,values)
  const rows=await select(db,`SELECT e.*,f.name farmName,f.timezone,actor.name actorName,${eventResource} resourceType,
    COALESCE(t.name,a.name,task.title,CASE WHEN ${eventResource}='farm' THEN f.name END) resourceName
    ${base} LEFT JOIN Accounts actor ON actor.id=e.actorId
    LEFT JOIN Troughs t ON t.id=e.resourceId AND t.farmId=e.farmId AND ${eventResource}='trough'
    LEFT JOIN Animals a ON a.id=e.resourceId AND a.farmId=e.farmId AND ${eventResource}='animal'
    LEFT JOIN Tasks task ON task.id=e.resourceId AND task.farmId=e.farmId AND e.type='task'
    WHERE ${where} ORDER BY e.occurredAt DESC,e.id DESC LIMIT :limit OFFSET :offset`,values)
  return paginated(rows,Number(count.total),p)
 }}
}
