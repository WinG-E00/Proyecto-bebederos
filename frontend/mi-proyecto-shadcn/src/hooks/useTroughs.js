import { useLiveQuery } from './useLiveQuery.js'
export function useTroughs(farmId, page = 1, id) {
  return useLiveQuery(
    'troughs',
    id ? `/troughs/${id}` : `/troughs?page=${page}${farmId ? `&farmId=${farmId}` : ''}`,
    farmId || 'all',
  )
}
