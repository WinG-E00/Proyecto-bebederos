import Historial from '@/pages/Historial/Historial.jsx'
import DashboardDetails from '@/components/DashboardDetails.jsx'
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
import AppLayout from '@/components/AppLayout.jsx'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
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
import OwnerDashboard from '@/components/OwnerDashboard.jsx'
import InterfazPeon from '@/pages/interfazPeon/InterfazPeon.jsx'

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
    <div className="dashboard-query-state">
      <AsyncState loading={query.isPending||scope.farms.isPending} error={query.error||scope.farms.error} onRetry={()=>{query.refetch();scope.farms.refetch()}}/>
      {query.stale&&<p role="status">Sin conexión. Resumen anterior.</p>}
      {scope.invalidScope&&<p>No tenés acceso al establecimiento seleccionado.</p>}
    </div>
    {data&&!scope.invalidScope&&(account.role==='owner'?<OwnerDashboard data={data} scope={scope} alerts={alerts.data?.items ?? []} activity={tasks.data?.items ?? []}
      status={<><AsyncState loading={alerts.isPending||tasks.isPending} error={alerts.error||tasks.error} onRetry={()=>{alerts.refetch();tasks.refetch()}}/>{(alerts.stale||tasks.stale)&&<p role="status">Sin conexión. Alertas y actividad anteriores.</p>}</>}
    />:<WorkerPanel scope={scope} summary={data}>{details}</WorkerPanel>)}
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
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/animals" element={<Animales />} />
        <Route path="/map" element={<Mapa />} />
        <Route path="/troughs" element={<Bebederos />} />
        <Route path="/farms" element={<Establecimientos />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/team" element={<Peones />} />
        <Route path="/alerts" element={<Alertas />} />
        <Route path="/weather" element={<Clima />} />
        <Route path="/history" element={<ProtectedRoute role="owner"><Historial /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
