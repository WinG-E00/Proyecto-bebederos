import { useEffect, useId, useState } from 'react'
import {
  Award,
  CalendarDays,
  Clock,
  Droplets,
  MapPin,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  Bell,
  User,
  Waves,
} from 'lucide-react'
import MapaBebederos from './MapaBebederos'
import { formatDate } from '../../lib/dates.js'
import './InterfazPeon.css'
import PanelSection from '../../components/PanelSection.jsx'

// Limita el nivel visible a 0–100; sin medición devuelve null para no mostrar ceros inventados.
function porcentajeSeguro(valor) {
  return Number.isFinite(valor) ? Math.min(100, Math.max(0, valor)) : null
}

function InterfazPeon({
  bebederos = [],
  usuario = 'Operador Campo',
  establecimiento = 'Campos asignados',
  animalCount,
  onActualizar,
  cargando = false,
  error = '',
  summary,
  farmId,
  center,
  children,
  compact = false,
}) {
  const titleId = useId()
  const [darkMode, setDarkMode] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const records = bebederos
  const measured = records.filter((b) => Number.isFinite(b.porcentaje)).length
  const cattle = animalCount ?? '—'
  const risks = summary ? summary.water.low + summary.water.critical : records.filter((b) => Number.isFinite(b.porcentaje) && b.porcentaje <= 50).length

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const stats = [
    {
      label: 'Bebederos Activos',
      value: summary?.troughs ?? '—',
      detail: 'Bebederos activos autorizados',
      Icon: Droplets,
      color: 'agua',
    },
    {
      label: 'Ganado Monitoreado',
      value: cattle,
      detail: 'Animales activos autorizados',
      Icon: Award,
      color: 'ganado',
    },
    {
      label: 'Alertas activas',
      value: summary?.activeAlerts ?? '—',
      detail: 'Condiciones para revisar',
      Icon: Bell,
      color: 'clima',
    },
    {
      label: 'Estado General',
      value: risks ? 'Atención' : !records.length || !measured ? 'Sin datos' : 'Normal',
      detail: risks ? `${risks} con agua Bajo o Crítico` : 'Según registros disponibles',
      Icon: ShieldCheck,
      color: 'alertas',
    },
  ]

  return (
    <div className={`interfaz-peon${darkMode ? ' interfaz-peon--dark' : ''}`}>
      <header className="interfaz-peon__navbar">
        <div className="interfaz-peon__nav-container">
          <a href="/" className="interfaz-peon__brand">
            <span className="interfaz-peon__logo">
              <Droplets aria-hidden="true" />
            </span>
            <span>
              <strong>Proyecto bebederos</strong>
              <small>Monitoreo Ganadero</small>
            </span>
          </a>
          <div className="interfaz-peon__nav-right">
            <span className="interfaz-peon__clock">
              <Clock size={17} aria-hidden="true" />
              <time dateTime={now.toISOString()}>
                {now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </time>
            </span>
            <button
              type="button"
              className="interfaz-peon__theme"
              onClick={() => setDarkMode((value) => !value)}
              aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
              aria-pressed={darkMode}
            >
              {darkMode ? (
                <Sun size={18} aria-hidden="true" />
              ) : (
                <Moon size={18} aria-hidden="true" />
              )}
              <span>Modo</span>
            </button>
            <div className="interfaz-peon__user">
              <User aria-hidden="true" />
              <span>
                <strong>{usuario}</strong>
                <small>{establecimiento}</small>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="interfaz-peon__main" aria-busy={cargando}>
        <header className="interfaz-peon__heading">
          <div>
            <h1>Monitoreo de Bebederos</h1>
            <p>Estado hídrico y telemetría de ganado</p>
            <span className="interfaz-peon__system">Resumen de las mediciones disponibles</span>
          </div>
          <span className="interfaz-peon__date">
            <CalendarDays size={17} aria-hidden="true" />
            {now.toLocaleDateString('es-AR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </header>

        {!compact && <section className="interfaz-peon__stats" aria-label="Resumen de monitoreo">
          {stats.map(({ label, value, detail, Icon, color }) => (
            <div className="interfaz-peon__stat" key={label}>
              <span className={`interfaz-peon__stat-icon interfaz-peon__stat-icon--${color}`}>
                <Icon aria-hidden="true" />
              </span>
              <div>
                <h2>{label}</h2>
                <strong>{value}</strong>
                <small>{detail}</small>
              </div>
            </div>
          ))}
        </section>}

        {cargando && (
          <p role="status" className="interfaz-peon__notice">
            Cargando bebederos…
          </p>
        )}
        {error && (
          <p role="alert" className="interfaz-peon__notice">
            {error}
          </p>
        )}

        {compact && children}
        <PanelSection enabled={compact} title="Mediciones de bebederos" description={`${records.length} registros disponibles · Consultar niveles y telemetría`} icon={Waves}>
        <section aria-labelledby={titleId}>
          <h2 className="interfaz-peon__section-title" id={titleId}>
            <Waves aria-hidden="true" /> Bebederos en Registro
          </h2>
          {!records.length && !cargando && (
            <p className="interfaz-peon__notice">No hay bebederos registrados.</p>
          )}
          <div className="interfaz-peon__cards">
            {records.map((b) => {
              const estado = {
                texto: b.waterCategory ?? 'Sin medición',
                clase:
                  b.waterCategory === 'Crítico'
                    ? 'riesgo'
                    : b.waterCategory === 'Bajo'
                      ? 'atencion'
                      : 'normal',
              }
              const level = porcentajeSeguro(b.porcentaje)
              return (
                <article className="interfaz-peon__card" key={b.id}>
                  <header className="interfaz-peon__card-header">
                    <div>
                      <h3>
                        <MapPin size={19} aria-hidden="true" />
                        {b.ubicacion || 'Sin ubicación'}
                      </h3>
                      <p>Bebedero Módulo #{b.id}</p>
                    </div>
                    <span className={`interfaz-peon__badge interfaz-peon__badge--${estado.clase}`}>
                      {estado.texto}
                    </span>
                  </header>
                  <div className="interfaz-peon__level-heading">
                    <span>
                      <Droplets size={16} aria-hidden="true" />
                      Nivel de Agua
                    </span>
                    <strong>{level == null ? '—' : `${level}%`}</strong>
                  </div>
                  <div
                    className={`interfaz-peon__progress interfaz-peon__progress--${level > 50 ? 'green' : level >= 20 ? 'yellow' : 'red'}`}
                    role="progressbar"
                    aria-label={`Nivel de agua del bebedero ${b.id}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={level ?? undefined}
                    aria-valuetext={level == null ? 'Sin medición' : `${level}%`}
                  >
                    <span style={{ width: `${level ?? 0}%` }} />
                  </div>
                  <dl className="interfaz-peon__details">
                    <div>
                      <dt>Estado operativo</dt>
                      <dd>{b.operationalState}</dd>
                    </div>
                    <div>
                      <dt>Última actualización</dt>
                      <dd>{formatDate(b.lastUpdatedAt)}</dd>
                    </div>
                    <div>
                      <dt>Vigencia</dt>
                      <dd>
                        {b.freshness === 'stale'
                          ? 'Datos desactualizados'
                          : b.freshness === 'missing'
                            ? 'Sin datos recibidos'
                            : 'Datos vigentes'}
                      </dd>
                    </div>
                    <div>
                      <dt>Capacidad</dt>
                      <dd>{b.capacityLiters} litros</dd>
                    </div>
                  </dl>
                  <button
                    className="interfaz-peon__update"
                    type="button"
                    disabled={cargando || !onActualizar}
                    onClick={onActualizar}
                  >
                    <RefreshCw size={17} aria-hidden="true" />
                    Consultar mediciones
                  </button>
                </article>
              )
            })}
          </div>
        </section>

        </PanelSection>
        {!compact && children}
        {!compact && <section className="interfaz-peon__map-card" aria-labelledby={`${titleId}-map`}>
          <div className="interfaz-peon__map-heading">
            <div>
              <h2 id={`${titleId}-map`}>
                <MapPin aria-hidden="true" />
                Ubicación en Terreno
              </h2>
              <p>Geolocalización de puntos de agua y ganado</p>
            </div>
            <span className="interfaz-peon__system">Ubicaciones registradas</span>
          </div>
          <MapaBebederos farmId={farmId} center={center} />
        </section>}
      </main>

      <footer className="interfaz-peon__footer">
        <strong>Proyecto bebederos</strong>
        <span>© 2026 Todos los derechos reservados.</span>
      </footer>
    </div>
  )
}

export default InterfazPeon
