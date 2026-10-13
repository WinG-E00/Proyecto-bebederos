import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import AsyncState from './AsyncState.jsx'

// Ocultar rutas no reemplaza a la API: el servidor vuelve a autorizar cada solicitud.
export default function ProtectedRoute({ role, children }) {
  const { account, status, error, refresh } = useAuth()
  const location = useLocation()
  if (status === 'loading' || status === 'error') {
    return <main className="grid min-h-dvh place-items-center p-4">
      <AsyncState loading={status === 'loading'} error={error} onRetry={() => refresh()} />
    </main>
  }
  if (!account) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (role && account.role !== role) return <Navigate to="/dashboard" replace />
  return children
}
