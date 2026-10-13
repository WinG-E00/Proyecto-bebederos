import { createContext, createElement, useCallback, useContext, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '../services/api.js'

export const AUTH_QUERY_KEY = ['auth', 'me']
const AuthContext = createContext(null)
const notAuth = (query) => query.queryKey[0] !== AUTH_QUERY_KEY[0]

// Retira todos los datos de la cuenta anterior sin tocar la consulta de sesión.
async function dropAccountData(client) {
  await client.cancelQueries({ predicate: notAuth })
  client.removeQueries({ predicate: notAuth })
}

// La cuenta y su rol salen siempre de GET /auth/me; nunca de localStorage.
// Se consulta fuera del cliente compartido: para un visitante anónimo el 401 es normal y
// no debe reiniciar el CSRF ni cancelar un registro, login o verificación en curso.
async function fetchAccount() {
  let response
  try {
    response = await fetch('/api/v1/auth/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
  } catch {
    throw new ApiError(503, 'NETWORK_ERROR', 'No se pudo conectar. Intentá nuevamente.')
  }
  if (response.status === 401) return null
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.account) throw new ApiError(response.ok ? 503 : response.status, data?.code ?? 'INVALID_RESPONSE', data?.message ?? 'No se pudo comprobar la sesión.')
  return data.account
}

export function AuthProvider({ children }) {
  const client = useQueryClient()
  // Se consulta cada 10 s en la vista visible: una sesión cerrada o invalidada se retira sola.
  const query = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const previous = client.getQueryData(AUTH_QUERY_KEY)
      const next = await fetchAccount()
      // Si la sesión terminó o cambió de cuenta, no queda ningún dato de la anterior.
      if (previous && previous.id !== next?.id) {
        api.reset()
        await dropAccountData(client)
      }
      return next
    },
    refetchInterval: 10000,
  })
  const account = query.data ?? null

  const login = useCallback(async (credentials) => {
    const data = await api.request('/auth/login', { method: 'POST', body: credentials })
    await dropAccountData(client)
    client.setQueryData(AUTH_QUERY_KEY, data.account)
    return data.account
  }, [client])

  const logout = useCallback(async () => {
    try {
      await api.request('/auth/logout', { method: 'POST' })
    } finally {
      await dropAccountData(client)
      client.setQueryData(AUTH_QUERY_KEY, null)
    }
  }, [client])

  const updateAccount = useCallback((next) => client.setQueryData(AUTH_QUERY_KEY, next), [client])

  const status = query.isPending ? 'loading' : account ? 'authenticated' : query.isError && query.data === undefined ? 'error' : 'anonymous'
  const { error, refetch } = query
  const value = useMemo(
    () => ({ account, status, error, refresh: refetch, login, logout, updateAccount }),
    [account, status, error, refetch, login, logout, updateAccount],
  )
  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
