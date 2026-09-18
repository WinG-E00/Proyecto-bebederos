import { Wrench, Wheat } from 'lucide-react'
import { useState } from 'react'
import AutorizationModule from '../autorizationModule/mainAutorization/autorizationModule'
import './interfaz-principal.css'
import backgroundImage from './fondo_vacas.webp'
import logo from './logo.png'

const roles = [
  { id: 'dueno', title: 'Dueño', description: 'Administración y control general del sistema.', Icon: Wheat },
  { id: 'peon', title: 'Peón', description: 'Gestión de tareas y mantenimiento.', Icon: Wrench },
]

function InterfazPrincipal() {
  const [showAutorization, setShowAutorization] = useState(false)

  const seleccionarRol = (rol) => {
    localStorage.setItem('rol', rol)
    setShowAutorization(true)
  }

  if (showAutorization) return <AutorizationModule />

  return (
    <div className="interfaz-principal" style={{ '--background-image': `url(${backgroundImage})` }}>
      <header className="interfaz-principal__header">
        <a className="interfaz-principal__brand" href="/" aria-label="Proyecto Bebederos, inicio">
          <img src={logo} alt="Proyecto Bebederos" />
        </a>
        <nav aria-label="Acciones de acceso">
          <button type="button" onClick={() => setShowAutorization(true)}>Iniciar sesión</button>
          <button type="button" onClick={() => setShowAutorization(true)}>Registrarse</button>
        </nav>
      </header>
      <main className="interfaz-principal__main">
        <section className="interfaz-principal__content" aria-labelledby="bienvenida">
          <h1 id="bienvenida">Bienvenido</h1>
          <p className="interfaz-principal__intro">Seleccione su tipo de usuario</p>
          <div className="interfaz-principal__roles">
            {roles.map(({ id, title, description, Icon }) => (
              <button className="interfaz-principal__role" key={id} type="button" onClick={() => seleccionarRol(id)}>
                <Icon aria-hidden="true" strokeWidth={1.8} />
                <span className="interfaz-principal__role-copy"><strong>{title}</strong><span>{description}</span></span>
              </button>
            ))}
          </div>
        </section>
      </main>
      <footer className="interfaz-principal__footer">Proyecto Bebederos © 2026</footer>
    </div>
  )
}

export default InterfazPrincipal
