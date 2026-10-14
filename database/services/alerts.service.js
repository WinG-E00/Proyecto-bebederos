import { select, insert, update } from './monitoringSql.service.js'
import { writeHistory } from './historyWriter.service.js'
import { waterCategory, freshness } from './water.service.js'
const messages = {
  water_low: 'Nivel de agua Bajo', water_critical: 'Nivel de agua Crítico',
  water_missing: 'Sin datos recibidos de agua', water_stale: 'Datos desactualizados de agua',
  gps_missing: 'Sin datos recibidos de GPS', gps_stale: 'Datos desactualizados de GPS',
}
export function alertConditions(type, { percentage, measuredAt }, minutes, now) {
  const conditions = []
  const status = freshness(measuredAt, minutes, now)
  const prefix = type === 'trough' ? 'water' : 'gps'
  if (status !== 'fresh') conditions.push(`${prefix}_${status}`)
  if (type === 'trough' && measuredAt) {
    const category = waterCategory(percentage)
    if (category === 'Bajo') conditions.push('water_low')
    if (category === 'Crítico') conditions.push('water_critical')
  }
  return conditions
}
// Callers hold the farm lock: episodes, history and sample state commit together.
export async function evaluateResourceAlerts(db, farm, type, id, sample, { transaction, now }) {
  const wanted = alertConditions(type, sample, farm.staleMinutes, now)
  const active = await select(db, 'SELECT * FROM Alerts WHERE farmId=:farmId AND resourceType=:type AND resourceId=:id AND resolvedAt IS NULL FOR UPDATE', {farmId:farm.id,type,id}, transaction)
  async function event(alertId, conditionName, resolved) {
    await writeHistory(db, { farmId:farm.id, type:'alert', resourceId:id, occurredAt:now,
      details:{alertId, resourceType:type, conditionName, resolved} }, {transaction})
  }
  for (const alert of active) if (!wanted.includes(alert.conditionName)) {
    await update(db,'Alerts',alert.id,{resolvedAt:now,activeKey:null},transaction)
    await event(alert.id,alert.conditionName,true)
  }
  for (const conditionName of wanted) if (!active.some(a=>a.conditionName===conditionName)) {
    const alertId = await insert(db,'Alerts',{farmId:farm.id,resourceType:type,resourceId:id,conditionName,
      message:messages[conditionName],generatedAt:now,activeKey:`${type}:${id}:${conditionName}`},transaction)
    await event(alertId,conditionName,false)
  }
}
