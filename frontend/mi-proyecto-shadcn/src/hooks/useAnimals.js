import { useLiveQuery } from './useLiveQuery.js'
export function useAnimals(farmId, page = 1, id) {
  return useLiveQuery(
    'animals',
    id ? `/animals/${id}` : `/animals?page=${page}${farmId ? `&farmId=${farmId}` : ''}`,
    farmId || 'all',
  )
}
