import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth.js'
import { clearRevokedFarms } from '../lib/queryClient.js'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from './useLiveQuery.js'
export function useFarmScope() {
  const [params, setParams] = useSearchParams()
  const farms = useLiveQuery('farms', '/farms?limit=100')
  const client = useQueryClient(),
    { account } = useAuth(),
    previous = useRef(null)
  useEffect(() => {
    if (!farms.data || account.role !== 'worker') return
    const ids = farms.data.items.map((f) => f.id)
    const removed =
      previous.current?.accountId === account.id
        ? previous.current.ids.filter((id) => !ids.includes(id))
        : []
    previous.current = { accountId: account.id, ids }
    if (removed.length) void clearRevokedFarms(client, account.id, removed)
  }, [farms.data, account.id, account.role, client])
  const requested = params.get('farmId') || ''
  const selected = farms.data?.items.find((f) => String(f.id) === requested)
  const farmId = selected ? String(selected.id) : ''
  function selectFarm(value) {
    setParams((p) => {
      const next = new URLSearchParams(p)
      value ? next.set('farmId', value) : next.delete('farmId')
      return next
    })
  }
  return {
    farms,
    farmId,
    selected,
    selectFarm,
    invalidScope: !!requested && !!farms.data && !selected,
  }
}
