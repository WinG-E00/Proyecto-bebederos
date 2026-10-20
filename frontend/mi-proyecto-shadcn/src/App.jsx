import Historial from '@/pages/Historial/Historial.jsx'
import DashboardDetails from '@/components/DashboardDetails.jsx'
import FarmSelector from '@/components/FarmSelector.jsx'
import { useFarmScope } from '@/hooks/useFarmScope.js'
import { useDashboard } from '@/hooks/useDashboard.js'
import { useAlerts } from '@/hooks/useAlerts.js'
import { useTasks } from '@/hooks/useTasks.js'
import Clima from '@/pages/Clima/Clima.jsx'
import Alertas from '@/pages/Alertas/Alertas.jsx'
import OwnerTasks from '@/pages/Tareas/OwnerTasks.jsx'
import WorkerTasks from '@/pages/Tareas/WorkerTasks.jsx'
import Peones from '@/pages/Peones/Peones.jsx'
import { useTroughs } from '@/hooks/useTroughs.js'
import Animales from '@/pages/Animales/Animales.jsx'
import Mapa from '@/pages/Animales/Mapa.jsx'
import Bebederos from '@/pages/Bebederos/Bebederos.jsx'
import Establecimientos from '@/pages/Establecimientos/Establecimientos.jsx'
import AppNavigation from '@/components/AppNavigation.jsx'
import { LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute.jsx'
import AsyncState from '@/components/AsyncState.jsx'
import { useAuth } from '@/hooks/useAuth.js'
import Login from '@/pages/autorizationModule/login-interface/login.jsx'
import Register from '@/pages/autorizationModule/register-interface/register.jsx'
import InvitationAccess from '@/pages/autorizationModule/InvitationAccess.jsx'
import {
  ForgotPassword,
  ResetPassword,
  VerifyEmail,
} from '@/pages/autorizationModule/IdentityActions.jsx'
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
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 bg-[#103c27] px-4 py-2 text-sm text-[#eff9ed]">
      <span className="mr-auto truncate">
        {account.name} · {ROLE_LABELS[account.role]}
      </span>
      <Link
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 hover:bg-white/15 focus-visible:outline-3 focus-visible:outline-[#d3a865]"
        to="/profile"
      >
        <UserRound aria-hidden="true" size={17} />
        Mi perfil
      </Link>
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 hover:bg-white/15 focus-visible:outline-3 focus-visible:outline-[#d3a865] disabled:opacity-70"
        onClick={signOut}
        disabled={leaving}
      >
        <LogOut aria-hidden="true" size={17} />
        {leaving ? 'Cerrando…' : 'Cerrar sesión'}
      </button>
    </div>
  )
}

function WorkerPanel({scope,summary,children}) {
  const { account } = useAuth()
  const troughs = useTroughs(scope.farmId)
  return (
    <InterfazPeon
      compact
      usuario={account.name}
      establecimiento={scope.selected?.name || 'Campos asignados'}
      bebederos={(troughs.data?.items ?? []).map((t) => ({...t,porcentaje:t.waterLevel,ubicacion:t.name}))}
      animalCount={summary.animals}
      summary={summary}
      farmId={scope.farmId}
      center={scope.selected}
      cargando={troughs.isPending}
      error={troughs.error?.message ?? (troughs.stale ? 'Sin conexión. Datos anteriores.' : '')}
      onActualizar={() => troughs.refetch()}
    >
      {troughs.data?.total>troughs.data?.items.length&&<Link className="inline-flex min-h-11 items-center underline" to={`/troughs${scope.farmId?`?farmId=${scope.farmId}`:''}`}>Ver todos los bebederos ({troughs.data.total})</Link>}
      {children}
    </InterfazPeon>
  )
}

function Dashboard() {
  const { account } = useAuth(), scope=useFarmScope()
  const query=useDashboard(scope.farmId), alerts=useAlerts(scope.farmId), tasks=useTasks({farmId:scope.farmId})
  const data=query.data
  const details=data?<DashboardDetails data={data} scope={scope} alerts={alerts.data?.items ?? []} activity={tasks.data?.items ?? []}/>:null
  return <>
    <SessionBar />
    <AppNavigation scope={scope} showProfile={false} />
    <div className="p-4 space-y-3">
      <FarmSelector scope={scope}/>
      <AsyncState loading={query.isPending||scope.farms.isPending} error={query.error||scope.farms.error} onRetry={()=>{query.refetch();scope.farms.refetch()}}/>
      {query.stale&&<p role="status">Sin conexión. Resumen anterior.</p>}
      {scope.invalidScope&&<p>No tenés acceso al establecimiento seleccionado.</p>}
    </div>
    {data&&!scope.invalidScope&&(account.role==='owner'?<InterfazDuenio compact>
      <AsyncState loading={alerts.isPending||tasks.isPending} error={alerts.error||tasks.error} onRetry={()=>{alerts.refetch();tasks.refetch()}}/>
      {details}
    </InterfazDuenio>:<WorkerPanel scope={scope} summary={data}>{details}</WorkerPanel>)}
  </>
}

// Login y registro no se muestran a una sesión iniciada.
function PublicOnly({ children }) {
  const { status, error, refresh } = useAuth()
  if (status === 'loading')
    return (
      <main className="grid min-h-dvh place-items-center p-4">
        <AsyncState loading />
      </main>
    )
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  if (status === 'error')
    return (
      <main className="grid min-h-dvh place-items-center p-4">
        <AsyncState error={error} onRetry={() => refresh()} />
      </main>
    )
  return children
}

function Tasks() {
  const { account } = useAuth()
  return account.role === 'owner' ? <OwnerTasks /> : <WorkerTasks />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <Register />
          </PublicOnly>
        }
      />
      <Route path="/registro" element={<Navigate to="/register" replace />} />
      <Route path="/invite" element={<InvitationAccess />} />
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/reset" element={<ResetPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/animals"
        element={
          <ProtectedRoute>
            <Animales />
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <Mapa />
          </ProtectedRoute>
        }
      />
      <Route
        path="/troughs"
        element={
          <ProtectedRoute>
            <Bebederos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/farms"
        element={
          <ProtectedRoute>
            <Establecimientos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <Peones />
          </ProtectedRoute>
        }
      />
      <Route path="/alerts" element={<ProtectedRoute><Alertas /></ProtectedRoute>} />
      <Route path="/weather" element={<ProtectedRoute><Clima /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute role="owner"><Historial /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
