export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code; this.fields = fields
  }
}
export function createApiClient({ fetchImpl = (...args) => fetch(...args), onAccessError = () => {} } = {}) {
  let csrfToken = null
  let csrfRequest = null
  let generation = 0
  function reset() { csrfToken = null; csrfRequest = null; generation += 1 }
  async function request(path, { method = 'GET', body, headers, signal } = {}) {
    if (typeof path !== 'string' || !/^\/[a-zA-Z0-9]/.test(path) || path.includes('\\') || path.startsWith('/api/')) {
      throw new Error('Usar una ruta relativa al contrato /api/v1, por ejemplo /farms')
    }
    const target = new URL(`/api/v1${path}`, 'https://same-origin.invalid')
    if (!target.pathname.startsWith('/api/v1/')) throw new Error('La ruta debe permanecer dentro de /api/v1')
    const currentGeneration = generation
    method = method.toUpperCase()
    if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) throw new Error('Método HTTP no permitido')
    const writing = !['GET', 'HEAD'].includes(method)
    if (writing && !csrfToken) {
      csrfRequest ??= request('/auth/csrf').then((data) => {
        if (!data?.csrfToken || typeof data.csrfToken !== 'string') throw new ApiError(503, 'INVALID_RESPONSE', 'No se pudo preparar la sesión.')
        if (currentGeneration === generation) csrfToken = data.csrfToken
        return data.csrfToken
      }).finally(() => { if (currentGeneration === generation) csrfRequest = null })
      await csrfRequest
    }
    if (currentGeneration !== generation) throw new DOMException('La sesión cambió.', 'AbortError')
    const requestHeaders = new Headers(headers)
    requestHeaders.set('Accept', 'application/json')
    if (body !== undefined) requestHeaders.set('Content-Type', 'application/json')
    if (writing) requestHeaders.set('X-CSRF-Token', csrfToken)
    let response
    try {
      response = await fetchImpl(`/api/v1${path}`, {
        method, credentials: 'same-origin', headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body), signal,
      })
    } catch (error) {
      if (error.name === 'AbortError') throw error
      throw new ApiError(503, 'NETWORK_ERROR', 'No se pudo conectar. Intentá nuevamente.')
    }
    if (currentGeneration !== generation) throw new DOMException('La sesión cambió.', 'AbortError')
    if (response.status === 204 || (method === 'HEAD' && response.ok)) {
      if (path === '/auth/logout') reset()
      return undefined
    }
    let data
    try {
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error()
      data = await response.json()
    } catch {
      if ([401, 403, 404].includes(response.status)) {
        if (response.status === 401) reset()
        await onAccessError({ status: response.status, path })
        throw new ApiError(response.status, 'ACCESS_DENIED', 'No tenés acceso a estos datos.')
      }
      throw new ApiError(503, 'INVALID_RESPONSE', 'El servidor devolvió una respuesta inválida.')
    }
    if (currentGeneration !== generation) throw new DOMException('La sesión cambió.', 'AbortError')
    if (!response.ok) {
      if ([401, 403, 404].includes(response.status)) {
        if (response.status === 401) reset()
        await onAccessError({ status: response.status, path })
      }
      throw new ApiError(response.status, data.code || 'REQUEST_FAILED', data.message || 'No se pudo completar la operación.', data.fields)
    }
    if (typeof data?.csrfToken === 'string') csrfToken = data.csrfToken
    if (path === '/auth/logout') reset()
    return data
  }
  return { request, reset }
}
export const api = createApiClient()
