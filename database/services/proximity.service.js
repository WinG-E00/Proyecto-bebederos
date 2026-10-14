export const validCoordinates = (p) =>
  Number.isFinite(p?.latitude) &&
  Number.isFinite(p?.longitude) &&
  Math.abs(p.latitude) <= 90 &&
  Math.abs(p.longitude) <= 180
export function haversine(a, b) {
  if (!validCoordinates(a) || !validCoordinates(b)) return Infinity
  const rad = (d) => (d * Math.PI) / 180
  const dlat = rad(b.latitude - a.latitude)
  const dlng = rad(b.longitude - a.longitude)
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dlng / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)))
}
export function nearestTrough(position, troughs, radius = 5) {
  return (
    troughs
      .map((t) => ({ ...t, distance: haversine(position, t) }))
      .filter((t) => t.distance <= radius + 1e-9)
      .sort((a, b) =>
        Math.abs(a.distance - b.distance) < 1e-9 ? a.id - b.id : a.distance - b.distance,
      )[0] ?? null
  )
}
export function entryVisit(previous, next) {
  return next != null && previous !== next
}
