import { useEffect } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../src/App.jsx'
import { AuthProvider } from '../src/hooks/useAuth.js'
import { api } from '../src/services/api.js'

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const empty = (status = 204) => new Response(null, { status })
const owner = { id: 1, name: 'Ana Dueña', email: 'ana@test.invalid', role: 'owner' }
const emptySummary = { farms: 0, animals: 0, troughs: 0, workers: 0, water: { low: 0, critical: 0, missing: 0 }, activeAlerts: 0, tasks: { pending: 0, inProgress: 0, validation: 0, total: 0 }, map: [] }
const worker = { id: 2, name: 'Pedro Peón', email: 'pedro@test.invalid', role: 'worker' }

// Servidor simulado: cada ruta responde según el estado de la prueba y registra lo enviado.
function mockApi(routes) {
  const calls = []
  const fetchMock = vi.fn(async (url, options = {}) => {
    const path = url.replace('/api/v1', '')
    const body = options.body ? JSON.parse(options.body) : undefined
    calls.push({ path, method: options.method ?? 'GET', body, csrf: options.headers?.get?.('X-CSRF-Token') })
    if (path === '/auth/csrf') return json({ csrfToken: 'csrf-test' })
    const handler = routes[`${options.method ?? 'GET'} ${path.split('?')[0]}`]
    if (!handler) return json({ code: 'NOT_FOUND', message: 'Recurso no encontrado.' }, 404)
    return handler({ path, body })
  })
  vi.stubGlobal('fetch', fetchMock)
  return calls
}

const probe = { path: '' }
function LocationProbe() {
  const location = useLocation()
  useEffect(() => { probe.path = location.pathname + location.search }, [location])
  return null
}

function renderApp(path, client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider><App /><LocationProbe /></AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return client
}

beforeEach(() => { api.reset(); probe.path = '' })

it('una ruta protegida sin sesión lleva al login y el rol de localStorage no autoriza', async () => {
  localStorage.setItem('rol', 'dueno')
  mockApi({ 'GET /auth/me': () => json({ code: 'UNAUTHENTICATED', message: 'Iniciá sesión para continuar.' }, 401) })
  renderApp('/dashboard')
  expect(await screen.findByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible()
  await waitFor(() => expect(probe.path).toBe('/login'))
})

it('el registro público no ofrece elegir rol ni lo envía', async () => {
  const calls = mockApi({
    'GET /auth/me': () => json({ code: 'UNAUTHENTICATED', message: '' }, 401),
    'POST /auth/register': () => json({ account: null, needsVerification: true }, 202),
  })
  const user = userEvent.setup()
  renderApp('/register')
  await screen.findByRole('heading', { name: 'Crear una cuenta' })
  expect(screen.queryByRole('combobox')).toBeNull()
  expect(screen.queryByText(/Peón/)).toBeNull()
  await user.type(screen.getByLabelText('Nombre completo'), 'Ana Dueña')
  await user.type(screen.getByLabelText('Correo electrónico'), 'ana@test.invalid')
  await user.type(screen.getByLabelText('Contraseña'), 'corta')
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('requisitos')
  await user.type(screen.getByLabelText('Contraseña'), '-y-segura')
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
  expect(await screen.findByRole('heading', { name: 'Revisá tu correo' })).toBeVisible()
  const sent = calls.find((call) => call.path === '/auth/register')
  expect(sent.body).toEqual({ name: 'Ana Dueña', email: 'ana@test.invalid', password: 'corta-y-segura' })
  expect(sent.csrf).toBe('csrf-test')
})

it('login usa la sesión del servidor, muestra el panel del rol y cerrar sesión obliga a reingresar', async () => {
  let session = null
  mockApi({
    'GET /auth/me': () => session ? json({ account: session }) : json({ code: 'UNAUTHENTICATED', message: '' }, 401),
    'POST /auth/login': () => { session = owner; return json({ account: owner, csrfToken: 'rotated' }) },
    'POST /auth/logout': () => { session = null; return empty() },
    // El panel espera el resumen real del alcance antes de mostrarse.
    'GET /dashboard': () => json(emptySummary),
    'GET /farms': () => json({ items: [], total: 0, page: 1, limit: 20 }),
  })
  // jsdom no implementa ResizeObserver, que usa el mapa del panel.
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  const user = userEvent.setup()
  const client = renderApp('/login')
  await user.type(await screen.findByLabelText('Correo electrónico'), owner.email)
  await user.type(screen.getByLabelText('Contraseña'), 'clave-segura-10')
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
  expect(await screen.findByRole('heading', { name: 'Dueño' })).toBeVisible()
  expect(screen.getByText('Ana Dueña · Dueño')).toBeVisible()
  client.setQueryData(['account', 1, 'farm', 'all', 'farms'], [{ id: 9 }])
  await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
  expect(await screen.findByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible()
  expect(client.getQueryData(['account', 1, 'farm', 'all', 'farms'])).toBeUndefined()
  expect(localStorage.getItem('rol')).toBeNull()
})

it('un correo sin verificar ofrece reenviar el enlace y no conserva la contraseña', async () => {
  const calls = mockApi({
    'GET /auth/me': () => json({ code: 'UNAUTHENTICATED', message: '' }, 401),
    'POST /auth/login': () => json({ code: 'EMAIL_NOT_VERIFIED', message: 'No tenés permiso para esta acción.' }, 403),
    'POST /auth/resend-verification': () => json({ accepted: true }, 202),
  })
  const user = userEvent.setup()
  renderApp('/login')
  await user.type(await screen.findByLabelText('Correo electrónico'), owner.email)
  await user.type(screen.getByLabelText('Contraseña'), 'clave-segura-10')
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
  expect(await screen.findByText(/verificar tu correo/)).toBeVisible()
  expect(screen.getByLabelText('Contraseña')).toHaveValue('')
  expect(screen.getByLabelText('Correo electrónico')).toHaveValue(owner.email)
  await user.click(screen.getByRole('button', { name: 'Reenviar enlace de verificación' }))
  expect(await screen.findByText(/te enviamos un enlace nuevo/)).toBeVisible()
  expect(calls.find((call) => call.path === '/auth/resend-verification').body).toEqual({ email: owner.email })
})

it('el perfil edita solo el nombre; correo y rol quedan de solo lectura', async () => {
  const calls = mockApi({
    'GET /auth/me': () => json({ account: worker }),
    'PATCH /profile': ({ body }) => json({ account: { ...worker, name: body.name } }),
  })
  const user = userEvent.setup()
  renderApp('/profile')
  const name = await screen.findByLabelText('Nombre')
  expect(screen.getByText(worker.email)).toBeVisible()
  expect(screen.getByText('Peón')).toBeVisible()
  expect(screen.getAllByRole('textbox')).toHaveLength(1)
  await user.clear(name)
  await user.type(name, 'Pedro P.')
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(await screen.findByText('Guardamos tu nombre.')).toBeVisible()
  expect(calls.find((call) => call.path === '/profile').body).toEqual({ name: 'Pedro P.' })
})

it('verificar consume el enlace una vez y lo retira de la URL', async () => {
  const calls = mockApi({ 'POST /auth/verify': () => empty() })
  renderApp('/verify?token=enlace-de-verificacion-prueba-123')
  expect(await screen.findByText(/quedó verificado/)).toBeVisible()
  await waitFor(() => expect(probe.path).toBe('/verify'))
  expect(calls.filter((call) => call.path === '/auth/verify')).toEqual([expect.objectContaining({ body: { token: 'enlace-de-verificacion-prueba-123' } })])
})

it('la invitación limpia el token de la URL, rechaza una cuenta dueño y acepta solo de forma explícita', async () => {
  let session = owner
  const calls = mockApi({
    'GET /auth/me': () => session ? json({ account: session }) : json({ code: 'UNAUTHENTICATED', message: '' }, 401),
    'GET /invitations/preview': () => json({ valid: true }),
    'POST /auth/logout': () => { session = null; return empty() },
    'POST /auth/login': () => { session = worker; return json({ account: worker, csrfToken: 'rotated' }) },
    'POST /invitations/accept': () => json({ accepted: true, farmIds: [3, 4] }),
  })
  const user = userEvent.setup()
  renderApp('/invite?token=token-de-invitacion-prueba-123')
  expect(await screen.findByText(/cuenta de dueño no puede aceptar/)).toBeVisible()
  await waitFor(() => expect(probe.path).toBe('/invite'))
  expect(calls.some((call) => call.path === '/invitations/accept')).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
  await user.click(await screen.findByRole('button', { name: 'Ya tengo cuenta' }))
  await user.type(screen.getByLabelText('Correo electrónico'), worker.email)
  await user.type(screen.getByLabelText('Contraseña'), 'clave-segura-10')
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión para aceptar' }))
  await user.click(await screen.findByRole('button', { name: 'Aceptar invitación' }))
  expect(await screen.findByText(/acceso a 2 campos/)).toBeVisible()
  expect(calls.find((call) => call.path === '/invitations/accept').body).toEqual({ token: 'token-de-invitacion-prueba-123' })
  expect(JSON.stringify({ ...localStorage })).not.toContain('token-de-invitacion')
  await waitFor(() => expect(sessionStorage.length).toBe(0))
})

it('una invitación vencida muestra el motivo sin pedir datos', async () => {
  mockApi({
    'GET /auth/me': () => json({ code: 'UNAUTHENTICATED', message: '' }, 401),
    'GET /invitations/preview': () => json({ valid: false, reason: 'expired' }),
  })
  renderApp('/invite?token=token-de-invitacion-vencida-1')
  expect(await screen.findByText(/La invitación venció/)).toBeVisible()
  expect(screen.queryByLabelText('Contraseña')).toBeNull()
})
