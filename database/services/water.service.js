export function waterCategory(value) {
  return !Number.isFinite(value) || value < 0 || value > 100
    ? null
    : value < 20
      ? 'Crítico'
      : value <= 50
        ? 'Bajo'
        : 'Normal'
}
export function freshness(measuredAt, minutes, now = new Date()) {
  return !measuredAt ? 'missing' : now - new Date(measuredAt) > minutes * 60000 ? 'stale' : 'fresh'
}
export function isNewerSample(sample, current) {
  return (
    !current ||
    new Date(sample.measuredAt) > new Date(current.measuredAt) ||
    (new Date(sample.measuredAt).getTime() === new Date(current.measuredAt).getTime() &&
      sample.id > current.id)
  )
}
export const iso = (value) => (value == null ? null : new Date(value).toISOString())
export function serializeTrough(row, now = new Date()) {
  const waterLevel = row.percentage == null ? null : Number(row.percentage)
  const { id, farmId, name, capacityLiters, operationalState, locationSource } = row
  return {
    id,
    farmId,
    name,
    capacityLiters,
    operationalState,
    locationSource,
    latitude: row.deviceLatitude ?? row.latitude,
    longitude: row.deviceLongitude ?? row.longitude,
    waterLevel,
    waterCategory: waterCategory(waterLevel),
    freshness: freshness(row.measuredAt, row.staleMinutes, now),
    lastUpdatedAt: iso(row.measuredAt),
    positionUpdatedAt: iso(row.positionMeasuredAt),
  }
}
