import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth.js'
import { authErrorMessage } from '@/lib/authMessages.js'
import { AuthShell, ResendVerification } from '../IdentityActions.jsx'
import './login.css'

// Formulario reutilizable (también en el recorrido de invitación). El rol lo decide el servidor.
export function LoginForm({ onSuccess, submitLabel = 'Iniciar sesión' }) {
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setIsSubmitting(true)
    setError(null)
    try {
      const account = await login({ email: formData.get('email'), password: formData.get('password') })
      await onSuccess?.(account)
    } catch (cause) {
      // Se conserva el correo; la contraseña nunca se vuelve a mostrar.
      form.elements.password.value = ''
      setError({ code: cause.code, message: authErrorMessage(cause), email: String(formData.get('email') ?? '') })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form id="formularioLogin" className="login__form" onSubmit={handleSubmit}>
      <label className="login__field">
        <span>Correo electrónico</span>
        <span className="login__input-wrap">
          <Mail aria-hidden="true" size={18} />
          <input name="email" type="email" autoComplete="email" placeholder="nombre@correo.com" required aria-invalid={Boolean(error)} aria-describedby={error ? 'login-error' : undefined} />
        </span>
      </label>

      <label className="login__field">
        <span>Contraseña</span>
        <span className="login__input-wrap">
          <LockKeyhole aria-hidden="true" size={18} />
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Ingresá tu contraseña"
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : undefined}
          />
          <button
            className="login__visibility"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>

      <button className="login__submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Ingresando…' : submitLabel}
      </button>
      {error && <p id="login-error" className="login__message login__message--error" role="alert">{error.message}</p>}
      {error?.code === 'EMAIL_NOT_VERIFIED' && <ResendVerification email={error.email} />}
      <p className="login__register-prompt"><Link to="/forgot">¿Olvidaste tu contraseña?</Link></p>
    </form>
  )
}

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const destination = typeof location.state?.from === 'string' ? location.state.from : '/dashboard'

  return (
    <AuthShell active="login" icon={LogIn} title="Bienvenido de nuevo" subtitle="Ingresá para continuar en Proyecto Bebederos.">
      <LoginForm onSuccess={() => navigate(destination, { replace: true })} />
      <p className="login__register-prompt">¿Todavía no tenés cuenta? <Link to="/register">Registrarse</Link></p>
    </AuthShell>
  )
}

export default Login
