import { createWaterProcessing } from '../services/waterProcessing.service.js'
import { createPositionProcessing } from '../services/positionProcessing.service.js'
import { createFreshnessService } from '../services/freshness.service.js'
export function createMonitorWorker(db, options = {}) {
  const water = createWaterProcessing(db, options)
  const positions = createPositionProcessing(db, options)
  const freshness = createFreshnessService(db, options)
  return { async process() {
    const processed = (await water.process()).processed + (await positions.process()).processed
    await freshness.process()
    return {processed}
  } }
}
