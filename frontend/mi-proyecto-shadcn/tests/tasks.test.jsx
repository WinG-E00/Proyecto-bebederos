import { it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../src/hooks/useAuth.js'
import { useTasks } from '../src/hooks/useTasks.js'
import { api, ApiError } from '../src/services/api.js'
import { clearRevokedFarms, queryKey } from '../src/lib/queryClient.js'
function Probe() {
  const q = useTasks({ farmId: '9' })
  const task = q.data?.items[0]
  return (
    <>
      {task && (
        <>
          <span>Versión {task.version}</span>
          <button
            disabled={q.pending || !!q.conflict}
            onClick={() => q.act(task, 'start')}
          >
            Iniciar
          </button>
        </>
      )}
      {q.conflict && <button onClick={q.reviewed}>Revisé los datos</button>}
    </>
  )
}
it('409 obtiene nueva versión y exige revisión explícita, sin repetir la escritura', async () => {
  const user = userEvent.setup(),
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ account: { id: 7, name: 'Peón', role: 'worker' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    ),
  )
  let version = 1,
    writes = 0
  vi.spyOn(api, 'request').mockImplementation(async (path, options = {}) => {
    if (path === '/auth/me')
      return { account: { id: 7, name: 'Peón', role: 'worker' } }
    if (options.method === 'POST') {
      writes++
      if (writes === 1) {
        version = 2
        throw new ApiError(409, 'STALE_TASK', 'Cambió')
      }
      expect(options.body.expectedVersion).toBe(2)
      return {}
    }
    return { items: [{ id: 1, version }], total: 1 }
  })
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  )
  await screen.findByText('Versión 1')
  await user.click(screen.getByRole('button', { name: 'Iniciar' }))
  await screen.findByText('Versión 2')
  expect(screen.getByRole('button', { name: 'Iniciar' })).toBeDisabled()
  expect(writes).toBe(1)
  await user.click(screen.getByRole('button', { name: 'Revisé los datos' }))
  await user.click(screen.getByRole('button', { name: 'Iniciar' }))
  await waitFor(() => expect(writes).toBe(2))
  client.clear()
})
it('revocación limpia agregado y alcance perdido y conserva otro dueño/campo', async () => {
  const client = new QueryClient()
  for (const [accountId, farmId, domain] of [
    [1, 9, 'map'],
    [1, null, 'tasks'],
    [1, 10, 'map'],
    [2, 9, 'map'],
  ])
    client.setQueryData(queryKey(accountId, farmId, domain), ['private'])
  await clearRevokedFarms(client, 1, [9])
  expect(client.getQueryData(queryKey(1, 9, 'map'))).toBeUndefined()
  expect(client.getQueryData(queryKey(1, null, 'tasks'))).toBeUndefined()
  expect(client.getQueryData(queryKey(1, 10, 'map'))).toEqual(['private'])
  expect(client.getQueryData(queryKey(2, 9, 'map'))).toEqual(['private'])
  client.clear()
})
