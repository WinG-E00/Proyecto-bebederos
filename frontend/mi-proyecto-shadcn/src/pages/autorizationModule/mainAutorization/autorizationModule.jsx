import { LogIn, UserPlus } from 'lucide-react'
import { useState } from 'react'
import Login from '../login-interface/login'
import Register from '../register-interface/register'
import backgroundImage from '../../interfaz-principal/fondo_vacas.webp'
import logo from '../../interfaz-principal/logo.png'
import './autorizationModule.css'

function AutorizationModule() {
  const [view, setView] = useState(null)

  if (view === 'login') return <Login />
  if (view === 'register') return <Register />

  return (
    <div className="autorization-module" style={{ '--autorization-background': `url(${backgroundImage})` }}>
      <header className="autorization-module__header">
        <a className="autorization-module__brand" href="/" aria-label="Proyecto Bebederos, inicio">
          <img src={logo} alt="Proyecto Bebederos" />
        </a>
      </header>

      <main className="autorization-module__main">
        <section className="autorization-module__panel" aria-labelledby="autorization-title">
          <div className="autorization-module__heading">
            <span className="autorization-module__mark" aria-hidden="true"><LogIn size={23} strokeWidth={2} /></span>
            <div>
              <h1 id="autorization-title">Accedé a tu cuenta</h1>
              <p>Elegí cómo querés continuar en Proyecto Bebederos.</p>
            </div>
          </div>

          <div className="autorization-module__actions" aria-label="Opciones de acceso">
            <button className="autorization-module__login" type="button" onClick={() => setView('login')}>
              <LogIn aria-hidden="true" size={19} />
              Logearse
            </button>
            <button className="autorization-module__register" type="button" onClick={() => setView('register')}>
              <UserPlus aria-hidden="true" size={19} />
              Registrarse
            </button>
          </div>
        </section>
      </main>

      <footer className="autorization-module__footer">Proyecto Bebederos © 2026</footer>
    </div>
  )
}

export default AutorizationModule
