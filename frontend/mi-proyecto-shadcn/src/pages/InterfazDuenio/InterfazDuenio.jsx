import { useId, useState } from 'react'
import { Bell, CircleCheck, Droplets, House, Moon, Sun, Users, Wrench } from 'lucide-react'
import logo from '../interfaz-principal/logo.png'
import fondoVacas from '../interfaz-principal/fondo_vacas.webp'
import './InterfazDuenio.css'

const navigation = [
  { id: 'inicio', label: 'Inicio', Icon: House },
  { id: 'bebederos', label: 'Bebederos', Icon: Droplets },
  { id: 'peones', label: 'Peones', Icon: Users },
  { id: 'alertas', label: 'Alertas', Icon: Bell },
]

const exampleData = {
  estado: 'Funcionando correctamente',
  estadoOptimo: true,
  totalBebederos: 12,
  totalPeones: 3,
  alertas: [{ id: 'nivel-8', mensaje: 'Nivel bajo en bebedero #8' }],
  actividad: [
    { id: 'recarga-3', mensaje: 'Bebedero #3 recargado' },
    { id: 'peon-activo', mensaje: 'Peón activo' },
  ],
}

/** Pasar datos del sistema para reemplazar el resumen de ejemplo de la referencia. */
function InterfazDuenio({ datos = exampleData, onNavigate }) {
  const sectionId = useId()
  const [activeSection, setActiveSection] = useState('inicio')
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('modo') === 'dark'
    } catch {
      return false
    }
  })
  const { estado, estadoOptimo, totalBebederos, totalPeones, alertas = [], actividad = [] } = datos

  function toggleTheme() {
    const nextMode = !darkMode
    setDarkMode(nextMode)
    try {
      localStorage.setItem('modo', nextMode ? 'dark' : 'light')
    } catch {
      // El cambio de tema sigue disponible si el navegador bloquea el almacenamiento.
    }
  }

  function navigate(event, destination) {
    setActiveSection(destination)
    if (onNavigate) {
      event.preventDefault()
      onNavigate(destination)
    }
  }

  return (
    <div className={`interfaz-duenio${darkMode ? ' interfaz-duenio--dark' : ''}`}>
      <aside className="interfaz-duenio__sidebar">
        <a className="interfaz-duenio__brand" href="/" aria-label="Proyecto Bebederos, inicio">
          <img src={logo} alt="Proyecto Bebederos" />
        </a>
        <nav aria-label="Panel del dueño">
          {navigation.map(({ id, label, Icon }) => (
            <a
              key={id}
              href={`#${sectionId}-${id}`}
              aria-current={activeSection === id ? 'location' : undefined}
              onClick={(event) => navigate(event, id)}
            >
              <Icon size={19} aria-hidden="true" />
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="interfaz-duenio__main" id={`${sectionId}-inicio`}>
        <header className="interfaz-duenio__header">
          <div>
            <h1>Dueño</h1>
            <p>Resumen general</p>
          </div>
          <button
            className="interfaz-duenio__theme"
            type="button"
            onClick={toggleTheme}
            aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
            aria-pressed={darkMode}
          >
            {darkMode ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
          </button>
        </header>

        {datos === exampleData && <p className="interfaz-duenio__demo">Datos de ejemplo de la referencia.</p>}

        <div className="interfaz-duenio__dashboard">
          <section className="interfaz-duenio__box interfaz-duenio__status" aria-labelledby={`${sectionId}-estado`}>
            <h2 id={`${sectionId}-estado`}>Estado del sistema</h2>
            <p>{estado || 'Estado no disponible'}</p>
            <span className={`interfaz-duenio__status-label${estadoOptimo ? '' : ' interfaz-duenio__status-label--warning'}`}>
              <span aria-hidden="true" />
              {estadoOptimo ? 'Óptimo' : 'Requiere atención'}
            </span>
          </section>

          <img className="interfaz-duenio__photo" src={fondoVacas} alt="Ganado en el campo" />

          <section className="interfaz-duenio__box interfaz-duenio__metric interfaz-duenio__bebederos" id={`${sectionId}-bebederos`} aria-labelledby={`${sectionId}-bebederos-title`}>
            <h2 id={`${sectionId}-bebederos-title`}>Bebederos</h2>
            <p className="interfaz-duenio__count">{totalBebederos ?? '—'}</p>
            <span className="interfaz-duenio__bar interfaz-duenio__bar--green" aria-hidden="true" />
          </section>

          <section className="interfaz-duenio__box interfaz-duenio__metric interfaz-duenio__alert-count" aria-labelledby={`${sectionId}-alertas-title`}>
            <h2 id={`${sectionId}-alertas-title`}>Alertas</h2>
            <p className="interfaz-duenio__count">{alertas.length}</p>
            <span className="interfaz-duenio__bar interfaz-duenio__bar--yellow" aria-hidden="true" />
          </section>

          <section className="interfaz-duenio__box interfaz-duenio__metric interfaz-duenio__peones" id={`${sectionId}-peones`} aria-labelledby={`${sectionId}-peones-title`}>
            <h2 id={`${sectionId}-peones-title`}>Peones</h2>
            <p className="interfaz-duenio__count">{totalPeones ?? '—'}</p>
            <span className="interfaz-duenio__bar interfaz-duenio__bar--blue" aria-hidden="true" />
          </section>

          <section className="interfaz-duenio__box interfaz-duenio__alerts" id={`${sectionId}-alertas`} aria-labelledby={`${sectionId}-alert-list-title`}>
            <h2 id={`${sectionId}-alert-list-title`}>Alertas</h2>
            {alertas.length ? (
              <ul>{alertas.map((alerta) => <li key={alerta.id}><Bell size={17} aria-hidden="true" /><span>{alerta.mensaje}</span></li>)}</ul>
            ) : <p>No hay alertas pendientes.</p>}
          </section>

          <section className="interfaz-duenio__box interfaz-duenio__activity" aria-labelledby={`${sectionId}-actividad-title`}>
            <h2 id={`${sectionId}-actividad-title`}>Actividad</h2>
            {actividad.length ? (
              <ul>{actividad.map((evento, index) => <li key={evento.id}>{index === 0 ? <CircleCheck size={17} aria-hidden="true" /> : <Wrench size={17} aria-hidden="true" />}<span>{evento.mensaje}</span></li>)}</ul>
            ) : <p>No hay actividad reciente.</p>}
          </section>
        </div>
      </main>
    </div>
  )
}

export default InterfazDuenio
