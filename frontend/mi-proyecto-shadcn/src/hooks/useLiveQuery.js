import { queryKey } from '../lib/queryClient.js'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth.js'
import { api } from '../services/api.js'
export function useLiveQuery(domain, path, scope = 'all') {
  const { account } = useAuth()
  const query = useQuery({
    queryKey: account
      ? queryKey(
          account.id,
          scope === 'all' ? null : Number(scope),
          domain,
          path,
        )
      : ['anonymous', domain, path],
    enabled: !!account && !!path,
    queryFn: ({ signal }) => api.request(path, { signal }),
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (count, error) =>
      ![401, 403, 404].includes(error.status) && count < 1,
  })
  const denied = [401, 403, 404].includes(query.error?.status)
  return {
    ...query,
    data: denied ? undefined : query.data,
    denied,
    stale: !!query.error && !!query.data && !denied,
  }
}
