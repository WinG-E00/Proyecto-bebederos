import { useLiveQuery } from './useLiveQuery.js'
export function useDashboard(farmId='') {
 return useLiveQuery('dashboard',`/dashboard${farmId?`?farmId=${farmId}`:''}`,farmId||'all')
}
