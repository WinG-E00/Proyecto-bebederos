import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth.js'
import { useLiveQuery } from './useLiveQuery.js'
import { api } from '../services/api.js'
export function useTasks({ farmId = '', state = '', page = 1, id } = {}) {
  const query = useLiveQuery(
    'tasks',
    id
      ? `/tasks/${id}`
      : `/tasks?page=${page}${farmId ? `&farmId=${farmId}` : ''}${state ? `&state=${encodeURIComponent(state)}` : ''}`,
    farmId || 'all',
  )
  const client = useQueryClient(),
    { account } = useAuth()
  const [pending, setPending] = useState(false),
    [error, setError] = useState(null),
    [conflict, setConflict] = useState(null)
  async function refresh() {
    await client.invalidateQueries({ queryKey: ['account', account.id] })
  }
  async function act(task, action, extra = {}) {
    if (pending || conflict) return
    setPending(true)
    setError(null)
    try {
      await api.request(`/tasks/${task.id}/actions`, {
        method: 'POST',
        body: { action, expectedVersion: task.version, ...extra },
      })
      await refresh()
    } catch (err) {
      setError(err)
      if (err.code === 'STALE_TASK') {
        setConflict(task.id)
        await refresh()
      } else if ([403, 404].includes(err.status)) await refresh()
    } finally {
      setPending(false)
    }
  }
  async function create(body) {
    setPending(true)
    setError(null)
    try {
      await api.request(`/farms/${farmId}/tasks`, { method: 'POST', body })
      await refresh()
    } finally {
      setPending(false)
    }
  }
  function reviewed() {
    setConflict(null)
    setError(null)
  }
  return {
    ...query,
    act,
    create,
    pending,
    error: error ?? query.error,
    conflict,
    reviewed,
  }
}
