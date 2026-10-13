import { beforeAll, afterAll, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createApiClient, ApiError } from '../src/services/api.js'
import { createQueryClient, queryKey, clearAccountCache, removeScope } from '../src/lib/queryClient.js'
import AsyncState from '../src/components/AsyncState.jsx'
import ConfirmAction from '../src/components/ConfirmAction.jsx'

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
it('usa cookies y CSRF previo a escritura y no guarda autorización en localStorage', async () => {
  const fetchImpl = vi.fn().mockResolvedValueOnce(json({ csrfToken: 'csrf-only-in-memory' })).mockResolvedValueOnce(json({ id: 7 }))
  const api = createApiClient({ fetchImpl })
  expect(await api.request('/farms', { method: 'POST', body: { name: 'Prueba' } })).toEqual({ id: 7 })
  expect(fetchImpl.mock.calls[0][0]).toBe('/api/v1/auth/csrf')
  const [path, options] = fetchImpl.mock.calls[1]
  expect(path).toBe('/api/v1/farms'); expect(options.credentials).toBe('same-origin')
  expect(options.headers.get('X-CSRF-Token')).toBe('csrf-only-in-memory')
  expect(options.body).toBe(JSON.stringify({ name: 'Prueba' }))
  expect(localStorage.length).toBe(0)
})
it('consolida CSRF concurrente y conserva errores 409 sin repetir escrituras', async () => {
  const fetchImpl = vi.fn((url) => Promise.resolve(url.endsWith('/csrf') ? json({ csrfToken: 'csrf' }) : json({ code: 'STALE_TASK', message: 'Revisá el estado.' }, 409)))
  const api = createApiClient({ fetchImpl })
  const result = await Promise.allSettled([api.request('/tasks/1/actions', { method: 'POST' }), api.request('/tasks/2/actions', { method: 'POST' })])
  expect(fetchImpl).toHaveBeenCalledTimes(3)
  for (const item of result) expect(item.reason).toMatchObject({ status: 409, code: 'STALE_TASK' })
})
it('logout 204 limpia CSRF y una sesión nueva lo solicita otra vez', async () => {
  const fetchImpl = vi.fn().mockResolvedValueOnce(json({ csrfToken: 'first' })).mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(json({ csrfToken: 'second' })).mockResolvedValueOnce(json({ ok: true }))
  const api = createApiClient({ fetchImpl })
  await api.request('/auth/logout', { method: 'POST' })
  await api.request('/auth/login', { method: 'POST' })
  expect(fetchImpl.mock.calls[2][0]).toBe('/api/v1/auth/csrf')
  expect(fetchImpl.mock.calls[3][1].headers.get('X-CSRF-Token')).toBe('second')
})
it('rechaza origen externo, respuestas HTML y avisa al perder permisos', async () => {
  const onAccessError = vi.fn()
  const api = createApiClient({ fetchImpl: vi.fn().mockResolvedValue(json({ code: 'NOT_FOUND', message: 'Recurso no encontrado.' }, 404)), onAccessError })
  await expect(api.request('https://example.com')).rejects.toThrow()
  await expect(api.request('/farms/../../private')).rejects.toThrow()
  await expect(api.request('/farms/1')).rejects.toMatchObject({ status: 404 })
  expect(onAccessError).toHaveBeenCalledWith({ status: 404, path: '/farms/1' })
  await expect(createApiClient({ fetchImpl: vi.fn().mockResolvedValue(new Response('<html>')) }).request('/farms')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
})
it('descarta respuesta tardía de la cuenta anterior', async () => {
  let finish
  const api = createApiClient({ fetchImpl: () => new Promise((resolve) => { finish = resolve }) })
  const pending = api.request('/farms')
  api.reset(); finish(json({ private: 'previous-account' }))
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
})
it('retira acceso también si el proxy devuelve una denegación HTML', async () => {
  const onAccessError = vi.fn()
  const api = createApiClient({ fetchImpl: vi.fn().mockResolvedValue(new Response('<html>denied</html>', { status: 403 })), onAccessError })
  await expect(api.request('/farms/7')).rejects.toMatchObject({ status: 403, code: 'ACCESS_DENIED' })
  expect(onAccessError).toHaveBeenCalledWith({ status: 403, path: '/farms/7' })
})
it('separa caché por cuenta/campo y limpia alcance revocado y resúmenes', async () => {
  const client = createQueryClient()
  client.setQueryData(queryKey(1, 7, 'troughs'), ['private'])
  client.setQueryData(queryKey(1, null, 'dashboard'), ['summary'])
  client.setQueryData(queryKey(2, 8, 'troughs'), ['other'])
  expect(client.getQueryData(queryKey(2, 7, 'troughs'))).toBeUndefined()
  await removeScope(client, 1, 7)
  expect(client.getQueryData(queryKey(1, 7, 'troughs'))).toBeUndefined()
  expect(client.getQueryData(queryKey(1, null, 'dashboard'))).toBeUndefined()
  expect(client.getQueryData(queryKey(2, 8, 'troughs'))).toEqual(['other'])
  const reset = vi.fn(); await clearAccountCache(client, { reset })
  expect(reset).toHaveBeenCalledOnce(); expect(client.getQueryCache().getAll()).toHaveLength(0)
  expect(client.getDefaultOptions().mutations.retry).toBe(false)
})
it('muestra carga/vacío/error sin inventar datos y permite reintentar', async () => {
  const onRetry = vi.fn()
  const { rerender } = render(<AsyncState loading><p>Dato privado</p></AsyncState>)
  expect(screen.getByRole('status')).toHaveTextContent('Cargando')
  expect(screen.queryByText('Dato privado')).not.toBeInTheDocument()
  rerender(<AsyncState empty emptyMessage="Sin bebederos" />)
  expect(screen.getByRole('status')).toHaveTextContent('Sin bebederos')
  rerender(<AsyncState error={new ApiError(503, 'TEST', 'Sin conexión')} onRetry={onRetry} />)
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
  expect(onRetry).toHaveBeenCalledOnce()
})

let showModal; let close
beforeAll(() => {
  // jsdom no implementa el modal; teclado/foco nativos se verifican en Playwright.
  showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
  close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.removeAttribute('open') } })
})
afterAll(() => {
  if (showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal)
  else delete HTMLDialogElement.prototype.showModal
  if (close) Object.defineProperty(HTMLDialogElement.prototype, 'close', close)
  else delete HTMLDialogElement.prototype.close
})
it('confirmación informa un fallo y permite cancelar sin ejecutar de nuevo', async () => {
  const onConfirm = vi.fn().mockRejectedValue(new Error('No se puede retirar: hay tareas abiertas.'))
  const onCancel = vi.fn()
  render(<ConfirmAction open title="Retirar campo" description="Se conservará el historial." onConfirm={onConfirm} onCancel={onCancel} />)
  expect(screen.getByRole('dialog')).toHaveAccessibleName('Retirar campo')
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('tareas abiertas')
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(onConfirm).toHaveBeenCalledOnce(); expect(onCancel).toHaveBeenCalledOnce()
})
