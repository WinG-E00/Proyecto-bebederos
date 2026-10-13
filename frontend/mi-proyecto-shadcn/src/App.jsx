import { LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute.jsx'
import AsyncState from '@/components/AsyncState.jsx'
import { useAuth } from '@/hooks/useAuth.js'
import Login from '@/pages/autorizationModule/login-interface/login.jsx'
import Register from '@/pages/autorizationModule/register-interface/register.jsx'
import InvitationAccess from '@/pages/autorizationModule/InvitationAccess.jsx'
import { ForgotPassword, ResetPassword, VerifyEmail } from '@/pages/autorizationModule/IdentityActions.jsx'
import Profile from '@/pages/Profile/Profile.jsx'
import InterfazDuenio from '@/pages/InterfazDuenio/InterfazDuenio.jsx'
import InterfazPeon from '@/pages/interfazPeon/InterfazPeon.jsx'

const ROLE_LABELS = { owner: 'Dueño', worker: 'Peón' }

// Barra de cuenta sobre los paneles existentes: perfil y cierre de sesión sin rediseñarlos.
function SessionBar() {
  const { account, logout } = useAuth()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)
  async function signOut() {
    setLeaving(true)
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 bg-[#103c27] px-4 py-2 text-sm text-[#eff9ed]">
      <span className="mr-auto truncate">{account.name} · {ROLE_LABELS[account.role]}</span>
      <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 hover:bg-white/15 focus-visible:outline-3 focus-visible:outline-[#d3a865]" to="/profile">
        <UserRound aria-hidden="true" size={17} />Mi perfil
      </Link>
      <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 hover:bg-white/15 focus-visible:outline-3 focus-visible:outline-[#d3a865] disabled:opacity-70" onClick={signOut} disabled={leaving}>
        <LogOut aria-hidden="true" size={17} />{leaving ? 'Cerrando…' : 'Cerrar sesión'}
      </button>
    </div>
  )
}

// El panel se elige por el rol que devuelve la API, nunca por localStorage.
function Dashboard() {
  const { account } = useAuth()
  return <>
    <SessionBar />
    {account.role === 'owner' ? <InterfazDuenio /> : <InterfazPeon usuario={account.name} establecimiento={ROLE_LABELS.worker} />}
  </>
}

// Login y registro no se muestran a una sesión iniciada.
function PublicOnly({ children }) {
  const { status, error, refresh } = useAuth()
  if (status === 'loading') return <main className="grid min-h-dvh place-items-center p-4"><AsyncState loading /></main>
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  if (status === 'error') return <main className="grid min-h-dvh place-items-center p-4"><AsyncState error={error} onRetry={() => refresh()} /></main>
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/registro" element={<Navigate to="/register" replace />} />
      <Route path="/invite" element={<InvitationAccess />} />
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset" element={<ResetPassword />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
