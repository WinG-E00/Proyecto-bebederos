import { MailOpen } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api.js'
import { AUTH_QUERY_KEY, useAuth } from '@/hooks/useAuth.js'
import { useLinkToken } from '@/hooks/useLinkToken.js'
import { authErrorMessage, invitationReasons } from '@/lib/authMessages.js'
import { AuthShell } from './IdentityActions.jsx'
import { LoginForm } from './login-interface/login.jsx'
import { RegisterForm } from './register-interface/register.jsx'

const CLOSED = ['INVITATION_NOT_FOUND', 'INVITATION_EXPIRED', 'INVITATION_WITHDRAWN', 'INVITATION_USED', 'INVITATION_NO_FARMS']

function Message({ error, children }) {
  return <p className={`login__message${error ? ' login__message--error' : ''}`} role={error ? 'alert' : 'status'}>{children}</p>
}

// /invite?token=: crear cuenta o iniciar sesión y aceptar explícitamente. El token vive solo
// en memoria; la URL se limpia al abrir y el token se descarta al terminar el recorrido.
export default function InvitationAccess() {
  const token = useLinkToken()
  const { account, status, login, logout } = useAuth()
  const client = useQueryClient()
  const started = useRef(false)
  const [preview, setPreview] = useState(token ? { state: 'checking' } : { state: 'invalid', reason: 'invalid' })
  const [mode, setMode] = useState('register')
  const [notice, setNotice] = useState(null)
  const [accept, setAccept] = useState({ state: 'idle' })

  function checkPreview() {
    setPreview({ state: 'checking' })
    api.request(`/invitations/preview?token=${encodeURIComponent(token)}`)
      .then((result) => setPreview(result.valid ? { state: 'valid' } : { state: 'invalid', reason: result.reason }))
      .catch((cause) => setPreview({ state: 'error', message: authErrorMessage(cause) }))
  }
  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    checkPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function acceptInvitation() {
    setAccept({ state: 'sending' })
    try {
      const result = await api.request('/invitations/accept', { method: 'POST', body: { token } })
      // Los permisos cambiaron: se vuelven a consultar los datos del alcance de la cuenta.
      await client.invalidateQueries({ predicate: (query) => query.queryKey[0] !== AUTH_QUERY_KEY[0] })
      setAccept({ state: 'done', farms: result.farmIds.length })
    } catch (cause) {
      setAccept({ state: CLOSED.includes(cause.code) ? 'closed' : 'idle', error: authErrorMessage(cause), code: cause.code })
    }
  }

  async function registered(_result, credentials) {
    try {
      await login({ email: credentials.email, password: credentials.password })
    } catch {
      setMode('login')
      setNotice('Tu cuenta de peón quedó creada. Iniciá sesión para aceptar la invitación.')
    }
  }

  let content
  if (preview.state === 'checking' || status === 'loading') {
    content = <Message>Comprobando la invitación…</Message>
  } else if (preview.state === 'error') {
    content = <>
      <Message error>{preview.message}</Message>
      <button className="login__submit" type="button" onClick={checkPreview}>Reintentar</button>
    </>
  } else if (preview.state === 'invalid') {
    content = <>
      <Message error>{invitationReasons[preview.reason] ?? invitationReasons.invalid}</Message>
      <p className="login__register-prompt"><Link to="/login">Ir a iniciar sesión</Link></p>
    </>
  } else if (accept.state === 'done') {
    content = <>
      <Message>Aceptaste la invitación. Ya tenés acceso a {accept.farms === 1 ? '1 campo' : `${accept.farms} campos`}.</Message>
      <Link className="login__submit login__link-button" to="/dashboard" replace>Ir a mi panel</Link>
    </>
  } else if (accept.state === 'closed') {
    content = <>
      <Message error>{accept.error}</Message>
      <p className="login__register-prompt"><Link to="/dashboard">Ir a mi panel</Link></p>
    </>
  } else if (account?.role === 'owner') {
    content = <>
      <Message error>{authErrorMessage({ code: 'ROLE_INCOMPATIBLE' })}</Message>
      <button className="login__submit login__submit--secondary" type="button" onClick={() => logout()}>Cerrar sesión</button>
    </>
  } else if (account) {
    content = <>
      <div className="login__readonly"><small>Sesión iniciada como</small>{account.name} · {account.email}</div>
      <p className="login__register-prompt">Al aceptar, el dueño te da acceso a los campos incluidos en esta invitación. Podés acumular invitaciones de distintos dueños.</p>
      <button className="login__submit" type="button" onClick={acceptInvitation} disabled={accept.state === 'sending'}>
        {accept.state === 'sending' ? 'Aceptando…' : 'Aceptar invitación'}
      </button>
      {accept.error && <Message error>{accept.error}</Message>}
      {accept.code === 'INVITATION_EMAIL_MISMATCH' && <button className="login__submit login__submit--secondary" type="button" onClick={() => logout()}>Usar otra cuenta</button>}
    </>
  } else {
    content = <>
      <div className="login__choice" role="group" aria-label="Cómo querés continuar">
        <button type="button" aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setNotice(null) }}>Crear cuenta</button>
        <button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>Ya tengo cuenta</button>
      </div>
      {notice && <Message>{notice}</Message>}
      {mode === 'register'
        ? <RegisterForm invitationToken={token} onRegistered={registered} submitLabel="Crear cuenta de peón" />
        : <LoginForm submitLabel="Iniciar sesión para aceptar" />}
      <p className="login__register-prompt">Usá el mismo correo al que llegó la invitación.</p>
    </>
  }

  return (
    <AuthShell icon={MailOpen} title="Invitación a Proyecto Bebederos" subtitle="Un dueño te invitó a sumarte como peón.">
      <div className="login__form">{content}</div>
    </AuthShell>
  )
}
