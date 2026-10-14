import { createWaterProcessing } from '../services/waterProcessing.service.js'
import { createPositionProcessing } from '../services/positionProcessing.service.js'
export function createMonitorWorker(db, options = {}) {
  const water = createWaterProcessing(db, options)
  const positions = createPositionProcessing(db, options)
  return {
    process: async () => ({
      processed: (await water.process()).processed + (await positions.process()).processed,
    }),
  }
}
