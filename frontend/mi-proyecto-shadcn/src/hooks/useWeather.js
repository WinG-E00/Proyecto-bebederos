import { useLiveQuery } from './useLiveQuery.js'
export function useWeather(farmId) {
 return useLiveQuery('weather',farmId?`/farms/${farmId}/weather`:null,farmId||'all')
}
