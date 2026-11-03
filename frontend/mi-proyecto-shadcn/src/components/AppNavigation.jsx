import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Clock, LogOut, UserRound } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import logo from '../pages/interfaz-principal/logo.png'

const ROLE_LABELS = { owner: 'Dueño', worker: 'Peón' }

export default function AppNavigation({ scope, showProfile = true }) {
  const { account, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [now, setNow] = useState(() => new Date())
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function signOut() {
    setLeaving(true)
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const navItems = [
    ['/dashboard', 'Panel'],
    ['/farms', 'Establecimientos'],
    ['/troughs', 'Bebederos'],
    ['/animals', 'Animales'],
    ['/map', 'Mapa'],
    ['/tasks', 'Tareas'],
    ['/alerts', 'Alertas'],
    ['/weather', 'Clima'],
    ...(account?.role === 'owner' ? [['/team', 'Equipo'], ['/history', 'Historial']] : []),
    ['/profile', 'Mi perfil'],
  ].filter(([to]) => showProfile || to !== '/profile')

  return (
    <header className="bg-gradient-to-r from-[#0a2719] via-[#0f3823] to-[#0a2719] text-[#eff9ed] shadow-md border-b border-emerald-500/20">
      {/* Barra superior con identidad, reloj y usuario */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link
          to={`/dashboard${scope?.farmId ? `?farmId=${scope.farmId}` : ''}`}
          className="inline-flex min-h-11 items-center gap-2.5 rounded-xl text-white font-bold tracking-tight hover:opacity-90 focus-visible:outline-3 focus-visible:outline-[#d3a865]"
        >
          <div className="flex flex-col items-center gap-0.5">
            <img
              src={logo}
              alt="Proyecto Bebederos"
              className="h-9 w-auto rounded-lg shadow-xs"
            />
            <span className="text-[9px] text-emerald-300/80 font-medium tracking-wider uppercase leading-none">Monitoreo Rural</span>
          </div>
        </Link>

        {/* Reloj en vivo */}
        <div className="hidden sm:inline-flex items-center gap-2 rounded-full bg-black/35 px-3.5 py-1.5 text-xs font-medium text-emerald-200 border border-emerald-500/25 shadow-inner backdrop-blur-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <Clock size={14} className="text-emerald-300" aria-hidden="true" />
          <time dateTime={now.toISOString()} className="tracking-wide">
            {now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
          </time>
        </div>

        {/* Acciones de usuario */}
        {account && (
          <div className="flex flex-wrap items-center gap-2.5 text-sm">
            <div className="inline-flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-xs shadow-xs ring-1 ring-white/20">
                {(account.name || 'U').charAt(0).toUpperCase()}
              </span>
              <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold shadow-xs border ${
                account.role === 'owner'
                  ? 'bg-amber-500/20 text-amber-100 border-amber-400/40'
                  : 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40'
              }`}>
                {account.name?.toLowerCase() === 'duenio-a' || account.name?.toLowerCase() === 'dueño'
                  ? 'Dueño'
                  : (account.name?.toLowerCase() === (ROLE_LABELS[account.role] ?? '').toLowerCase()
                    ? (ROLE_LABELS[account.role] ?? account.role)
                    : `${account.name} · ${ROLE_LABELS[account.role] ?? account.role}`)}
              </span>
            </div>

            <Link
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/15 px-3 py-1.5 text-xs sm:text-sm font-medium transition-all text-emerald-100 hover:text-white border border-white/10 hover:border-white/20 shadow-xs focus-visible:outline-3 focus-visible:outline-[#d3a865]"
              to="/profile"
            >
              <UserRound aria-hidden="true" size={16} />
              <span>Mi perfil</span>
            </Link>

            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 text-xs sm:text-sm font-medium transition-all text-rose-200 hover:text-rose-100 border border-rose-500/20 hover:border-rose-500/35 shadow-xs focus-visible:outline-3 focus-visible:outline-[#d3a865] disabled:opacity-60"
              onClick={signOut}
              disabled={leaving}
            >
              <LogOut aria-hidden="true" size={16} />
              <span>{leaving ? 'Cerrando…' : 'Cerrar sesión'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Navegación por pestañas */}
      <nav
        aria-label="Navegación principal"
        className="flex flex-wrap items-center gap-1.5 border-t border-emerald-950/60 bg-[#092216] px-3 py-1.5 sm:px-6"
      >
        {navItems.map(([to, label]) => {
          const isActive = location.pathname === to
          return (
            <Link
              key={to}
              className={`inline-flex min-h-11 items-center rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all focus-visible:outline-3 focus-visible:outline-[#d3a865] ${
                isActive
                  ? 'bg-emerald-600/30 text-white font-bold border border-emerald-400/40 shadow-xs ring-1 ring-white/10'
                  : 'text-emerald-100/75 hover:bg-white/10 hover:text-white'
              }`}
              to={to + (scope?.farmId ? `?farmId=${scope.farmId}` : '')}
              aria-current={isActive ? 'page' : undefined}
            >
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
