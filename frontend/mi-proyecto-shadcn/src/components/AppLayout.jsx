import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useFarmScope } from '../hooks/useFarmScope.js'
import AppNavigation from './AppNavigation.jsx'

export default function AppLayout() {
  const scope = useFarmScope()
  const [mobileOpen, setMobileOpen] = useState(false)
  return <div className="app-layout">
    <AppNavigation scope={scope} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
    <div className="app-workspace" inert={mobileOpen}><Outlet /></div>
  </div>
}
