import { LogOut, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/services/api.js'
import { useAuth } from '@/hooks/useAuth.js'
import { authErrorMessage } from '@/lib/authMessages.js'
import { AuthShell } from '../autorizationModule/IdentityActions.jsx'

const ROLE_LABELS = { owner: 'Dueño', worker: 'Peón' }

// Perfil: nombre editable; correo y rol solo lectura. Cerrar sesión limpia la caché de la cuenta.
export default function Profile() {
  const { account, updateAccount, logout } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(account.name)
  const [state, setState] = useState({ status: 'idle' })
  const [leaving, setLeaving] = useState(false)

  async function save(event) {
    event.preventDefault()
    setState({ status: 'saving' })
    try {
      const { account: updated } = await api.request('/profile', { method: 'PATCH', body: { name } })
      updateAccount(updated)
      setName(updated.name)
      setState({ status: 'saved' })
    } catch (cause) {
      setState({ status: 'error', message: authErrorMessage(cause) })
    }
  }

  async function signOut() {
    setLeaving(true)
    try { await logout() } finally { navigate('/login', { replace: true }) }
  }

  return (
    <AuthShell icon={UserRound} title="Mi perfil" subtitle="Tus datos de acceso a Proyecto Bebederos." showAccessLinks={false}>
      <form className="login__form" onSubmit={save}>
        <label className="login__field">
          <span>Nombre</span>
          <span className="login__input-wrap">
            <UserRound aria-hidden="true" size={18} />
            <input name="name" type="text" autoComplete="name" required maxLength={255} value={name} onChange={(event) => { setName(event.target.value); setState({ status: 'idle' }) }} aria-describedby="profile-status" />
          </span>
        </label>
        <div className="login__readonly"><small>Correo electrónico (no editable)</small>{account.email}</div>
        <div className="login__readonly"><small>Rol (no editable)</small>{ROLE_LABELS[account.role]}</div>
        <button className="login__submit" type="submit" disabled={state.status === 'saving' || !name.trim() || name.trim() === account.name}>
          {state.status === 'saving' ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <div id="profile-status">
          {state.status === 'saved' && <p className="login__message" role="status">Guardamos tu nombre.</p>}
          {state.status === 'error' && <p className="login__message login__message--error" role="alert">{state.message}</p>}
        </div>
        <button className="login__submit login__submit--secondary" type="button" onClick={signOut} disabled={leaving}>
          <LogOut aria-hidden="true" size={17} style={{ display: 'inline', marginRight: 8, verticalAlign: '-3px' }} />
          {leaving ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </form>
      <p className="login__register-prompt"><Link to="/dashboard">Volver a mi panel</Link></p>
    </AuthShell>
  )
}
