import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react'
import { useState } from 'react'
import backgroundImage from '../../interfaz-principal/fondo_vacas.webp'
import logo from '../../interfaz-principal/logo.png'
import './login.css'

function Login({ moduloPeon, moduloDueno }) {
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('http://localhost:3000/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gmail: formData.get('gmail'),
          password: formData.get('password'),
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setMessageType('error')
        setMessage(data.mensaje || data.message || 'No se pudo iniciar sesión. Intentá nuevamente.')
        return
      }

      const usuario = data.usuario || data.user
      const perfilId = Number(usuario?.perfilId)
      const redirectToRoleModule = perfilId === 2 ? moduloDueno : moduloPeon

      if (perfilId === 1) {
        console.log('Se logeo en perfil peon')
      } else if (perfilId === 2) {
        console.log('Se logeo en perfil dueño')
      } else {
        setMessageType('error')
        setMessage('El inicio de sesión fue correcto, pero el perfil recibido no es válido.')
        return
      }

      if (typeof redirectToRoleModule === 'function') {
        redirectToRoleModule(usuario)
        return
      }

      setMessageType('success')
      setMessage('Inicio de sesión correcto. El módulo de tu rol estará disponible próximamente.')
    } catch {
      setMessageType('error')
      setMessage('No se pudo conectar con el servidor. Intentá nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login" style={{ '--login-background': `url(${backgroundImage})` }}>
      <header className="login__header">
        <a className="login__brand" href="/" aria-label="Proyecto Bebederos, inicio">
          <img src={logo} alt="Proyecto Bebederos" />
        </a>
        <nav className="login__navigation" aria-label="Acciones de acceso">
          <a className="login__active-link" href="/login" aria-current="page">Iniciar sesión</a>
          <a href="/registro">Registrarse</a>
        </nav>
      </header>

      <main className="login__main">
        <section className="login__panel" aria-labelledby="login-title">
          <div className="login__panel-heading">
            <span className="login__mark" aria-hidden="true"><LogIn size={22} strokeWidth={2} /></span>
            <div>
              <h1 id="login-title">Bienvenido de nuevo</h1>
              <p>Ingresá para continuar en Proyecto Bebederos.</p>
            </div>
          </div>

          <form id="formularioLogin" className="login__form" onSubmit={handleSubmit}>
            <label className="login__field">
              <span>Correo electrónico</span>
              <span className="login__input-wrap">
                <Mail aria-hidden="true" size={18} />
                <input name="gmail" type="email" autoComplete="email" placeholder="nombre@correo.com" required />
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
              {isSubmitting ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
            {message && <p className={`login__message login__message--${messageType}`} role="status">{message}</p>}
          </form>

          <p className="login__register-prompt">¿Todavía no tenés cuenta? <a href="/registro">Registrarse</a></p>
        </section>
      </main>

      <footer className="login__footer">Proyecto Bebederos © 2026</footer>
    </div>
  )
}

export default Login
