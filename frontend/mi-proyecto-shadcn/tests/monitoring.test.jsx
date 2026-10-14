import { it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../src/hooks/useAuth.js'
import { useLiveQuery } from '../src/hooks/useLiveQuery.js'
import { api } from '../src/services/api.js'
function Probe() {
  const q = useLiveQuery('troughs', '/troughs?farmId=9', '9')
  return (
    <>
      <span>{q.data?.items?.[0]?.name ?? 'Sin datos'}</span>
      {q.stale && <p>Datos anteriores</p>}
      {q.denied && <p>Acceso retirado</p>}
    </>
  )
}
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
it('conserva datos anteriores ante red y retira contenido ante revocación; caché por cuenta/campo', async () => {
  api.reset()
  let status = 200
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path) =>
      path.endsWith('/auth/me')
        ? json({ account: { id: 7, role: 'worker', name: 'Peón' } })
        : status === 200
          ? json({ items: [{ name: 'Bebedero visible' }] })
          : json({ code: 'ERROR', message: 'Error' }, status),
    ),
  )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Bebedero visible')).toBeVisible()
  expect(
    client.getQueryData([
      'account',
      7,
      'farm',
      9,
      'troughs',
      '/troughs?farmId=9',
    ]),
  ).toBeTruthy()
  status = 503
  await client.invalidateQueries({ queryKey: ['account', 7] })
  await waitFor(() =>
    expect(screen.getByText('Datos anteriores')).toBeVisible(),
  )
  expect(screen.getByText('Bebedero visible')).toBeVisible()
  status = 403
  await client.invalidateQueries({ queryKey: ['account', 7] })
  expect(await screen.findByText('Acceso retirado')).toBeVisible()
  expect(screen.queryByText('Bebedero visible')).not.toBeInTheDocument()
  client.clear()
})
