export const waterSamples = (troughId, now = new Date()) =>
  [0, 19, 20, 50, 51, 100].map((percentage, index) => ({
    sourceKey: `water:${troughId}:${index}:${now.getTime()}`,
    resourceId: troughId,
    percentage,
    measuredAt: new Date(now.getTime() - 6000 + index * 1000).toISOString(),
  }))
