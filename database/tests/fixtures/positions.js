export const positionSamples = (animalId, now = new Date()) =>
  [0.001, 0, 0, 0.001, 0].map((latitude, index) => ({
    sourceKey: `position:${animalId}:${index}:${now.getTime()}`,
    resourceId: animalId,
    latitude,
    longitude: 0,
    measuredAt: new Date(now.getTime() - 5000 + index * 1000).toISOString(),
  }))
