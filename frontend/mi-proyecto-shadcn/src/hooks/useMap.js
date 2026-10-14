import { useLiveQuery } from './useLiveQuery.js'
export function useMap(farmId) {
  return useLiveQuery('map', `/map${farmId ? `?farmId=${farmId}` : ''}`, farmId || 'all')
}
