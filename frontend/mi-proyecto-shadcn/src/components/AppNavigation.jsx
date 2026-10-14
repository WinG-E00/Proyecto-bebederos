import { useAuth } from '../hooks/useAuth.js'
import { Link } from 'react-router-dom'
export default function AppNavigation({ scope, showProfile = true }) {
  const { account } = useAuth()
  return (
    <nav
      aria-label="Navegación principal"
      className="flex flex-wrap items-center gap-3 bg-[#103c27] p-4 text-[#eff9ed]"
    >
      {[
        ['/dashboard', 'Panel'],
        ['/farms', 'Establecimientos'],
        ['/troughs', 'Bebederos'],
        ['/animals', 'Animales'],
        ['/map', 'Mapa'],
        ['/tasks', 'Tareas'],
        ['/alerts', 'Alertas'],
        ['/weather', 'Clima'],
        ...(account.role === 'owner' ? [['/team', 'Equipo'], ['/history', 'Historial']] : []),
        ['/profile', 'Mi perfil'],
      ]
        .filter(([to]) => showProfile || to !== '/profile')
        .map(([to, label]) => (
          <Link
            key={to}
            className="inline-flex min-h-11 items-center rounded-lg px-2 hover:bg-white/15"
            to={to + (scope?.farmId ? `?farmId=${scope.farmId}` : '')}
          >
            {label}
          </Link>
        ))}
    </nav>
  )
}
