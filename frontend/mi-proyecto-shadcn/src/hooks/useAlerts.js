import { useLiveQuery } from './useLiveQuery.js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api.js'
export function useAlerts(farmId, active = true, page = 1) {
 return useLiveQuery('alerts', `/alerts?active=${active}&page=${page}${farmId ? `&farmId=${farmId}` : ''}`, farmId || 'all')
}
export function useNotifications(farmId, page = 1) {
 return useLiveQuery('notifications', `/notifications?page=${page}${farmId ? `&farmId=${farmId}` : ''}`, farmId || 'all')
}
export function useReadNotification() {
 const client=useQueryClient()
 return useMutation({mutationFn:id=>api.request(`/notifications/${id}/read`,{method:'POST',body:{}}),onSuccess:()=>client.invalidateQueries()})
}
