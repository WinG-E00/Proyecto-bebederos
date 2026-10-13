import { Eye, EyeOff, LockKeyhole, Mail, MailCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/services/api.js'
import { authErrorMessage, isValidPassword, passwordRules } from '@/lib/authMessages.js'
import { ResendVerification } from '../IdentityActions.jsx'
import backgroundImage from '../../interfaz-principal/fondo_vacas.webp'
import logo from '../../interfaz-principal/logo.png'
import './register.css'

// Sin selección de rol: el registro público crea siempre un dueño; un peón solo se
// registra con `invitationToken` desde el enlace de invitación.
export function RegisterForm({ invitationToken, onRegistered, submitLabel = 'Crear cuenta' }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    if (!isValidPassword(password)) {
      setError('La contraseña debe cumplir todos los requisitos indicados.')
      return
    }
    const credentials = { name: formData.get('nombre'), email: formData.get('email'), password }
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await api.request('/auth/register', { method: 'POST', body: invitationToken ? { ...credentials, invitationToken } : credentials })
      await onRegistered?.(result, credentials)
    } catch (cause) {
      // Nombre y correo se conservan; la contraseña no se vuelve a mostrar.
      setPassword('')
      setError(authErrorMessage(cause))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="register__form" onSubmit={handleSubmit}>
      <label className="register__field">
        <span>Nombre completo</span>
        <span className="register__input-wrap">
          <UserRound aria-hidden="true" size={18} />
          <input name="nombre" type="text" autoComplete="name" placeholder="Ej. María González" required maxLength={255} />
        </span>
      </label>

      <label className="register__field">
        <span>Correo electrónico</span>
        <span className="register__input-wrap">
          <Mail aria-hidden="true" size={18} />
          <input name="email" type="email" autoComplete="email" placeholder="nombre@correo.com" required maxLength={254} />
        </span>
      </label>

      <label className="register__field">
        <span>Contraseña</span>
        <span className="register__input-wrap">
          <LockKeyhole aria-hidden="true" size={18} />
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Creá una contraseña segura"
            required
            aria-describedby="register-password-rules"
          />
          <button
            className="register__visibility"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>

      <div className="register__password-feedback" aria-live="polite">
        <div className="register__rules" id="register-password-rules">
          {passwordRules.map((rule) => {
            const isValid = rule.isValid(password)
            return <span className={isValid ? 'is-valid' : ''} key={rule.id}>{isValid ? '✓' : '•'} {rule.label}</span>
          })}
        </div>
      </div>

      <button className="register__submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creando cuenta…' : submitLabel}
      </button>
      {error && <p className="register__message register__message--error" role="alert">{error}</p>}
    </form>
  )
}

function Register() {
  const [registeredEmail, setRegisteredEmail] = useState(null)

  return (
    <div className="register" style={{ '--register-background': `url(${backgroundImage})` }}>
      <header className="register__header">
        <Link className="register__brand" to="/" aria-label="Proyecto Bebederos, inicio">
          <img src={logo} alt="Proyecto Bebederos" />
        </Link>
        <nav className="register__navigation" aria-label="Acciones de acceso">
          <Link to="/login">Iniciar sesión</Link>
          <Link className="register__active-link" to="/register" aria-current="page">Registrarse</Link>
        </nav>
      </header>

      <main className="register__main">
        <section className="register__panel" aria-labelledby="register-title">
          <div className="register__panel-heading">
            <span className="register__mark" aria-hidden="true">{registeredEmail ? <MailCheck size={22} strokeWidth={2} /> : <UserRound size={22} strokeWidth={2} />}</span>
            <div>
              <h1 id="register-title">{registeredEmail ? 'Revisá tu correo' : 'Crear una cuenta'}</h1>
              <p>{registeredEmail ? 'Falta un paso para activar tu cuenta.' : 'Registrá tu establecimiento como dueño en Proyecto Bebederos.'}</p>
            </div>
          </div>

          {registeredEmail
            ? <div className="register__form">
              <p className="register__message" role="status">
                Si el correo {registeredEmail} no estaba registrado, te enviamos un enlace para verificarlo. Vence en 24 horas.
              </p>
              <ResendVerification email={registeredEmail} />
            </div>
            : <RegisterForm onRegistered={(_result, { email }) => setRegisteredEmail(String(email).trim().toLowerCase())} />}

          <p className="register__login-prompt">¿Te invitaron como peón? Abrí el enlace del correo de invitación.</p>
          <p className="register__login-prompt">¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link></p>
        </section>
      </main>

      <footer className="register__footer">Proyecto Bebederos © 2026</footer>
    </div>
  )
}

export default Register
