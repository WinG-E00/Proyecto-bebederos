import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useState } from 'react'
import backgroundImage from '../../interfaz-principal/fondo_vacas.webp'
import logo from '../../interfaz-principal/logo.png'
import './register.css'

const passwordRules = [
  { id: 'length', label: 'Al menos 6 caracteres', isValid: (value) => value.length >= 6 },
  { id: 'uppercase', label: 'Una letra mayúscula', isValid: (value) => /[A-Z]/.test(value) },
  { id: 'number', label: 'Un número', isValid: (value) => /\d/.test(value) },
]

function Register({ moduloPeon, moduloDueno }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validRules = passwordRules.filter((rule) => rule.isValid(password)).length
  const strength = password.length === 0 ? null : ['Débil', 'Media', 'Fuerte'][validRules - 1] || 'Débil'

  const handleSubmit = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const rol = formData.get('rol')
    const perfilIdPorRol = { peon: 1, dueno: 2 }
    const perfilId = perfilIdPorRol[rol]

    if (validRules !== passwordRules.length) {
      setMessageType('error')
      setMessage('La contraseña debe cumplir todos los requisitos indicados.')
      return
    }

    if (!perfilId) {
      setMessageType('error')
      setMessage('Seleccioná un rol para continuar.')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('http://localhost:3000/api/user/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: formData.get('nombre'),
          gmail: formData.get('email'),
          password,
          perfilId,
        }),
      })
      const data = await response.json()

      if (response.status !== 201) {
        setMessageType('error')
        setMessage(data.mensaje || 'No se pudo crear la cuenta. Intentá nuevamente.')
        return
      }

      const perfilIdRegistrado = Number(data.usuario?.perfilId)
      const redirectToRoleModule = perfilIdRegistrado === 2 ? moduloDueno : moduloPeon

      if (perfilIdRegistrado === 1) {
        console.log('Se logeo en perfil peon')
      } else if (perfilIdRegistrado === 2) {
        console.log('Se logeo en perfil dueño')
      } else {
        setMessageType('error')
        setMessage('La cuenta fue creada, pero el perfil recibido no es válido.')
        return
      }

      if (typeof redirectToRoleModule === 'function') {
        redirectToRoleModule(data.usuario)
        return
      }

      setMessageType('success')
      setMessage('Cuenta creada correctamente. El módulo de tu rol estará disponible próximamente.')
    } catch {
      setMessageType('error')
      setMessage('No se pudo conectar con el servidor. Intentá nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="register" style={{ '--register-background': `url(${backgroundImage})` }}>
      <header className="register__header">
        <a className="register__brand" href="/" aria-label="Proyecto Bebederos, inicio">
          <img src={logo} alt="Proyecto Bebederos" />
        </a>
        <nav className="register__navigation" aria-label="Acciones de acceso">
          <a href="/login">Iniciar sesión</a>
          <a className="register__active-link" href="/registro" aria-current="page">Registrarse</a>
        </nav>
      </header>

      <main className="register__main">
        <section className="register__panel" aria-labelledby="register-title">
          <div className="register__panel-heading">
            <span className="register__mark" aria-hidden="true"><UserRound size={22} strokeWidth={2} /></span>
            <div>
              <h1 id="register-title">Crear una cuenta</h1>
              <p>Registrá tu acceso a Proyecto Bebederos.</p>
            </div>
          </div>

          <form className="register__form" onSubmit={handleSubmit}>
            <label className="register__field">
              <span>Nombre completo</span>
              <span className="register__input-wrap">
                <UserRound aria-hidden="true" size={18} />
                <input name="nombre" type="text" autoComplete="name" placeholder="Ej. María González" required />
              </span>
            </label>

            <label className="register__field">
              <span>Correo electrónico</span>
              <span className="register__input-wrap">
                <Mail aria-hidden="true" size={18} />
                <input name="email" type="email" autoComplete="email" placeholder="nombre@correo.com" required />
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
              <div className="register__rules">
                {passwordRules.map((rule) => {
                  const isValid = rule.isValid(password)
                  return <span className={isValid ? 'is-valid' : ''} key={rule.id}>{isValid ? '✓' : '•'} {rule.label}</span>
                })}
              </div>
              {strength && <span className={`register__strength register__strength--${validRules}`}>Contraseña {strength.toLowerCase()}</span>}
            </div>

            <label className="register__field">
              <span>Rol</span>
              <select name="rol" defaultValue="" required>
                <option value="" disabled>Seleccioná tu rol</option>
                <option value="dueno">Dueño</option>
                <option value="peon">Peón</option>
              </select>
            </label>

            <button className="register__submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
            {message && <p className={`register__message register__message--${messageType}`} role="status">{message}</p>}
          </form>

          <p className="register__login-prompt">¿Ya tenés cuenta? <a href="/login">Iniciar sesión</a></p>
        </section>
      </main>

      <footer className="register__footer">Proyecto Bebederos © 2026</footer>
    </div>
  )
}

export default Register
