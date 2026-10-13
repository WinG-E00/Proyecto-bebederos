import { Eye, EyeOff, KeyRound, LockKeyhole, Mail, MailCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/services/api.js'
import { authErrorMessage, isValidPassword, passwordRules } from '@/lib/authMessages.js'
import { useLinkToken } from '@/hooks/useLinkToken.js'
import backgroundImage from '../interfaz-principal/fondo_vacas.webp'
import logo from '../interfaz-principal/logo.png'
import './login-interface/login.css'

// Marco visual de las pantallas de acceso: el mismo encabezado, panel y pie del login existente.
export function AuthShell({ active, icon: Icon, title, subtitle, showAccessLinks = true, children }) {
  return (
    <div className="login" style={{ '--login-background': `url(${backgroundImage})` }}>
      <header className="login__header">
        <Link className="login__brand" to="/" aria-label="Proyecto Bebederos, inicio">
          <img src={logo} alt="Proyecto Bebederos" />
        </Link>
        {showAccessLinks && <nav className="login__navigation" aria-label="Acciones de acceso">
          <Link className={active === 'login' ? 'login__active-link' : undefined} to="/login" aria-current={active === 'login' ? 'page' : undefined}>Iniciar sesión</Link>
          <Link className={active === 'register' ? 'login__active-link' : undefined} to="/register" aria-current={active === 'register' ? 'page' : undefined}>Registrarse</Link>
        </nav>}
      </header>
      <main className="login__main">
        <section className="login__panel" aria-labelledby="auth-title">
          <div className="login__panel-heading">
            <span className="login__mark" aria-hidden="true"><Icon size={22} strokeWidth={2} /></span>
            <div>
              <h1 id="auth-title">{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          {children}
        </section>
      </main>
      <footer className="login__footer">Proyecto Bebederos © 2026</footer>
    </div>
  )
}

function Status({ error, children }) {
  return <p className={`login__message${error ? ' login__message--error' : ''}`} role={error ? 'alert' : 'status'}>{children}</p>
}

// Pide un nuevo enlace de verificación. La respuesta es siempre genérica.
export function ResendVerification({ email }) {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  async function resend() {
    setState('sending'); setError(null)
    try {
      await api.request('/auth/resend-verification', { method: 'POST', body: { email } })
      setState('sent')
    } catch (cause) { setError(authErrorMessage(cause)); setState('idle') }
  }
  if (state === 'sent') return <Status>Si la cuenta necesita verificación, te enviamos un enlace nuevo válido por 24 horas.</Status>
  return <>
    <button className="login__submit login__submit--secondary" type="button" onClick={resend} disabled={state === 'sending' || !email}>
      {state === 'sending' ? 'Enviando…' : 'Reenviar enlace de verificación'}
    </button>
    {error && <Status error>{error}</Status>}
  </>
}

export function PasswordInput({ label, value, onChange, autoComplete = 'new-password', describedBy }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="login__field">
      <span>{label}</span>
      <span className="login__input-wrap">
        <LockKeyhole aria-hidden="true" size={18} />
        <input type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} required aria-describedby={describedBy} />
        <button className="login__visibility" type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  )
}

export function PasswordRules({ id, value }) {
  return <ul id={id} className="login__rules" aria-live="polite">
    {passwordRules.map((rule) => {
      const valid = rule.isValid(value)
      return <li key={rule.id} className={valid ? 'is-valid' : undefined}>{valid ? '✓' : '•'} {rule.label}</li>
    })}
  </ul>
}

// /verify?token=: consume el enlace una sola vez y lo retira de la URL.
export function VerifyEmail() {
  const token = useLinkToken()
  const started = useRef(false)
  const [state, setState] = useState(token ? 'verifying' : 'missing')
  const [error, setError] = useState(null)
  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    api.request('/auth/verify', { method: 'POST', body: { token } })
      .then(() => setState('verified'))
      .catch((cause) => { setError(authErrorMessage(cause)); setState('failed') })
  }, [token])

  return (
    <AuthShell icon={MailCheck} title="Verificación de correo">
      <div className="login__form">
        {state === 'verifying' && <Status>Verificando tu correo…</Status>}
        {state === 'verified' && <>
          <Status>Tu correo quedó verificado. Ya podés iniciar sesión.</Status>
          <Link className="login__submit login__link-button" to="/login">Iniciar sesión</Link>
        </>}
        {state === 'missing' && <Status error>El enlace de verificación está incompleto. Abrilo desde el correo recibido.</Status>}
        {state === 'failed' && <>
          <Status error>{error}</Status>
          <p className="login__register-prompt">Podés pedir un enlace nuevo desde <Link to="/login">Iniciar sesión</Link>.</p>
        </>}
      </div>
    </AuthShell>
  )
}

// /forgot: respuesta idéntica exista o no la cuenta.
export function ForgotPassword() {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  async function submit(event) {
    event.preventDefault()
    const email = new FormData(event.currentTarget).get('email')
    setState('sending'); setError(null)
    try {
      await api.request('/auth/forgot', { method: 'POST', body: { email } })
      setState('sent')
    } catch (cause) { setError(authErrorMessage(cause)); setState('idle') }
  }
  return (
    <AuthShell icon={KeyRound} title="Recuperar acceso" subtitle="Te enviaremos un enlace para elegir una nueva contraseña.">
      {state === 'sent'
        ? <div className="login__form"><Status>Si existe una cuenta con ese correo, te enviamos un enlace válido por 30 minutos.</Status></div>
        : <form className="login__form" onSubmit={submit}>
          <label className="login__field">
            <span>Correo electrónico</span>
            <span className="login__input-wrap">
              <Mail aria-hidden="true" size={18} />
              <input name="email" type="email" autoComplete="email" placeholder="nombre@correo.com" required />
            </span>
          </label>
          <button className="login__submit" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Enviar enlace'}</button>
          {error && <Status error>{error}</Status>}
        </form>}
      <p className="login__register-prompt"><Link to="/login">Volver a iniciar sesión</Link></p>
    </AuthShell>
  )
}

// /reset?token=: nueva contraseña; el servidor cierra todas las sesiones anteriores.
export function ResetPassword() {
  const token = useLinkToken()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  async function submit(event) {
    event.preventDefault()
    if (!isValidPassword(password)) { setError('La contraseña no cumple los requisitos indicados.'); return }
    if (password !== confirmation) { setError('Las contraseñas no coinciden.'); return }
    setState('sending'); setError(null)
    try {
      await api.request('/auth/reset', { method: 'POST', body: { token, password } })
      setState('done')
    } catch (cause) {
      setPassword(''); setConfirmation('')
      setError(authErrorMessage(cause)); setState(cause.code === 'TOKEN_INVALID' ? 'invalid' : 'idle')
    }
  }
  return (
    <AuthShell icon={KeyRound} title="Elegí una nueva contraseña">
      {!token && <div className="login__form"><Status error>El enlace está incompleto. Pedí uno nuevo.</Status></div>}
      {token && state === 'done' && <div className="login__form">
        <Status>Tu contraseña cambió. Cerramos las sesiones abiertas: iniciá sesión con la nueva contraseña.</Status>
        <Link className="login__submit login__link-button" to="/login">Iniciar sesión</Link>
      </div>}
      {token && state === 'invalid' && <div className="login__form"><Status error>{error}</Status></div>}
      {token && ['idle', 'sending'].includes(state) && <form className="login__form" onSubmit={submit}>
        <PasswordInput label="Nueva contraseña" value={password} onChange={setPassword} describedBy="reset-rules" />
        <PasswordRules id="reset-rules" value={password} />
        <PasswordInput label="Repetí la contraseña" value={confirmation} onChange={setConfirmation} />
        <button className="login__submit" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Guardando…' : 'Guardar contraseña'}</button>
        {error && <Status error>{error}</Status>}
      </form>}
      {(!token || state === 'invalid') && <p className="login__register-prompt"><Link to="/forgot">Pedir un enlace nuevo</Link></p>}
    </AuthShell>
  )
}
