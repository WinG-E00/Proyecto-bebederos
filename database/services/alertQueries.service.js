import { createAccessService } from './access.service.js'
import { select, update } from './monitoringSql.service.js'
import { pagination, paginated } from './pagination.js'
import { ApiError } from '../middleware/errors.js'
export function createAlertQueries(db,{clock={now:()=>new Date()}}={}) {
 const access=createAccessService(db)
 async function list(account, query, notifications=false) {
  const p=pagination(query)
  let ids=await access.farmIds(account)
  if(query.farmId){await access.farm(account,query.farmId);ids=[Number(query.farmId)]}
  if(!ids.length)return paginated([],0,p)
  const table=notifications?'Notifications':'Alerts'
  const where=`farmId IN (:ids) ${notifications?'AND recipientId=:accountId':`AND resolvedAt IS ${query.active==='false'?'NOT ':''}NULL`}`
  const values={ids,accountId:account.id,...p}
  const [count]=await select(db,`SELECT COUNT(*) total FROM ${table} WHERE ${where}`,values)
  const rows=await select(db,`SELECT * FROM ${table} WHERE ${where} ORDER BY ${notifications?'occurredAt':'generatedAt'} DESC,id DESC LIMIT :limit OFFSET :offset`,values)
  return paginated(rows.map(({activeKey: _key,...r})=>r),Number(count.total),p)
 }
 async function read(account,id) {
  if(!/^[1-9]\d*$/.test(String(id)))throw new ApiError(404,'NOT_FOUND')
  const [initial]=await select(db,'SELECT farmId FROM Notifications WHERE id=:id AND recipientId=:recipientId',{id,recipientId:account.id})
  if(!initial)throw new ApiError(404,'NOT_FOUND')
  await db.transaction(async transaction=>{
   await access.farm(account,initial.farmId,{transaction,lock:true})
   const [row]=await select(db,'SELECT * FROM Notifications WHERE id=:id AND recipientId=:recipientId FOR UPDATE',{id,recipientId:account.id},transaction)
   if(!row)throw new ApiError(404,'NOT_FOUND')
   if(!row.readAt)await update(db,'Notifications',row.id,{readAt:clock.now()},transaction)
  })
 }
 return {list,read}
}
