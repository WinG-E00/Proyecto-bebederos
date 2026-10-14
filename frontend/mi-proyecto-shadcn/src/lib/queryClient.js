import { QueryClient } from '@tanstack/react-query'
import { api } from '../services/api.js'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        refetchInterval: 10000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) =>
          ![401, 403, 404, 409, 422, 429].includes(error?.status) &&
          error?.name !== 'AbortError' &&
          failureCount < 1,
      },
      mutations: { retry: false },
    },
  })
}
export function scopeKey(accountId, farmId = null) {
  if (!Number.isSafeInteger(accountId) || accountId < 1)
    throw new Error('La caché requiere una cuenta identificada')
  if (farmId !== null && (!Number.isSafeInteger(farmId) || farmId < 1))
    throw new Error('Alcance de campo inválido')
  return ['account', accountId, 'farm', farmId ?? 'all']
}
export function queryKey(accountId, farmId, resource, ...filters) {
  return [...scopeKey(accountId, farmId), resource, ...filters]
}
export async function clearAccountCache(client, apiClient = api) {
  apiClient.reset()
  await client.cancelQueries()
  client.clear()
}
export async function removeScope(client, accountId, farmId) {
  const key = scopeKey(accountId, farmId)
  await client.cancelQueries({ queryKey: key })
  client.removeQueries({ queryKey: key })
  // Los resúmenes globales también pueden contener el campo revocado.
  await client.cancelQueries({ queryKey: scopeKey(accountId) })
  client.removeQueries({ queryKey: scopeKey(accountId) })
}
export const queryClient = createQueryClient()

// Clear revoked fields from scoped and aggregate caches before re-reading them.
export async function clearRevokedFarms(client, accountId, farmIds) {
  const predicate = (q) =>
    q.queryKey[0] === 'account' &&
    q.queryKey[1] === accountId &&
    q.queryKey[4] !== 'farms' &&
    (q.queryKey[3] === 'all' || farmIds.includes(q.queryKey[3]))
  await client.cancelQueries({ predicate })
  client.removeQueries({ predicate: (q) => predicate(q) && !q.isActive() })
  await client.resetQueries({ predicate: (q) => predicate(q) && q.isActive() })
}
