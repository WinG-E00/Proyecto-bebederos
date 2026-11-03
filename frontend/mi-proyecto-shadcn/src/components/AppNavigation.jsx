import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Beef, Bell, Building2, Check, ChevronRight, CloudSun, Droplets,
  History, LayoutDashboard, LogOut, Map, Menu, UserRound, Users, X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import FarmSelector from './FarmSelector.jsx'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/manrope'
import './AppNavigation.css'

const destinations = [
  ['/dashboard', 'Panel', LayoutDashboard],
  ['/farms', 'Establecimientos', Building2],
  ['/troughs', 'Bebederos', Droplets],
  ['/animals', 'Animales', Beef],
  ['/map', 'Mapa', Map],
  ['/tasks', 'Tareas', Check],
  ['/alerts', 'Alertas', Bell],
  ['/weather', 'Clima', CloudSun],
  ['/team', 'Equipo', Users, 'owner'],
  ['/history', 'Historial', History, 'owner'],
]

export default function AppNavigation({ scope, mobileOpen, setMobileOpen }) {
  const { account, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)
  const sidebar = useRef(null)
  const opener = useRef(null)
  const closer = useRef(null)
  const role = account.role === 'owner' ? 'Dueño' : 'Peón'
  const initials = account.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('es-AR')
  const suffix = scope.farmId ? `?farmId=${scope.farmId}` : ''
  const showFarm = !['/profile', '/team', '/history'].includes(pathname)

  function closeMenu() {
    setMobileOpen(false)
  }

  useEffect(() => {
    if (!mobileOpen) return
    const menuOpener = opener.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closer.current?.focus()
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMobileOpen(false)
      }
      if (event.key !== 'Tab') return
      const controls = [...sidebar.current.querySelectorAll('a[href], button:not([disabled])')]
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const desktop = window.matchMedia('(min-width: 761px)')
    const closeOnDesktop = event => { if (event.matches) setMobileOpen(false) }
    const closeOnBack = () => setMobileOpen(false)
    desktop.addEventListener('change', closeOnDesktop)
    window.addEventListener('popstate', closeOnBack)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      desktop.removeEventListener('change', closeOnDesktop)
      window.removeEventListener('popstate', closeOnBack)
      document.removeEventListener('keydown', onKeyDown)
      menuOpener?.focus()
    }
  }, [mobileOpen, setMobileOpen])

  async function signOut() {
    setLeaving(true)
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }

  return <>
    {mobileOpen && <button className="app-nav-scrim" type="button" tabIndex={-1} aria-label="Cerrar menú de navegación" onClick={closeMenu} />}
    <aside
      ref={sidebar}
      id="app-sidebar"
      className={`app-nav-sidebar${mobileOpen ? ' app-nav-sidebar--open' : ''}`}
      role={mobileOpen ? 'dialog' : undefined}
      aria-modal={mobileOpen ? true : undefined}
      aria-label="Menú de la aplicación"
      onTransitionEnd={event => {
        if (mobileOpen && event.target === event.currentTarget && event.propertyName === 'transform') closer.current?.focus()
      }}
    >
      <div className="app-nav-brand-row">
        <Link className="app-nav-brand" to={`/dashboard${suffix}`} onClick={closeMenu} aria-label="Proyecto Bebederos, inicio">
          <span className="app-nav-brand-mark"><Droplets size={23} strokeWidth={2.3} aria-hidden="true" /></span>
          <span><strong>Bebederos</strong><small>Monitoreo ganadero</small></span>
        </Link>
        <button ref={closer} className="app-nav-close" type="button" aria-label="Cerrar menú" onClick={closeMenu}><X size={20} aria-hidden="true" /></button>
      </div>
      <nav className="app-nav-links" aria-label="Navegación principal">
        <p className="app-nav-group-label">Gestión</p>
        {destinations.filter(([, , , requiredRole]) => !requiredRole || account.role === requiredRole).map(([to, label, Icon]) => (
          <NavLink key={to} to={to + suffix} className={({ isActive }) => `app-nav-item${isActive ? ' app-nav-item--active' : ''}`} onClick={closeMenu}>
            <Icon size={19} aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="app-nav-footer">
        <NavLink to={`/profile${suffix}`} className={({ isActive }) => `app-nav-profile-link${isActive ? ' app-nav-profile-link--active' : ''}`} onClick={closeMenu} aria-label="Mi perfil">
          <span className="app-nav-profile-icon"><UserRound size={18} aria-hidden="true" /></span>
          <span><strong>Mi perfil</strong><small>Tus datos de acceso</small></span>
          <ChevronRight size={16} aria-hidden="true" />
        </NavLink>
        <div className="app-nav-account">
          <span className="app-nav-avatar" aria-hidden="true">{initials}</span>
          <span className="app-nav-account-copy"><strong title={account.name}>{account.name}</strong><small>{role}</small></span>
          {pathname !== '/profile' && <button className="app-nav-logout" type="button" aria-label={leaving ? 'Cerrando sesión…' : 'Cerrar sesión'} title="Cerrar sesión" disabled={leaving} onClick={signOut}>
            <LogOut size={18} aria-hidden="true" />
          </button>}
        </div>
      </div>
    </aside>
    <header className="app-nav-topbar" inert={mobileOpen}>
      <button ref={opener} className="app-nav-menu app-nav-icon-button" type="button" aria-label="Abrir menú" aria-expanded={mobileOpen} aria-controls="app-sidebar" onClick={() => setMobileOpen(true)}><Menu size={22} aria-hidden="true" /></button>
      {showFarm ? <FarmSelector scope={scope} compact /> : <span className="app-nav-context">{pathname === '/team' ? 'Equipo' : pathname === '/history' ? 'Historial' : 'Mi perfil'}</span>}
      <div className="app-nav-top-actions">
        <Link className="app-nav-icon-button" aria-label="Notificaciones" title="Alertas y notificaciones" to={`/alerts${suffix}`}><Bell size={20} aria-hidden="true" /></Link>
        <Link className="app-nav-top-account" to={`/profile${suffix}`} aria-label="Abrir mi perfil">
          <span className="app-nav-avatar" aria-hidden="true">{initials}</span>
          <span><strong>{account.name}</strong><small>{role}</small></span>
          <ChevronRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </header>
  </>
}
