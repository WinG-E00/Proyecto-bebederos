import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Activity, Award, CalendarDays, Clock, Droplets, MapPin, Moon, RefreshCw, ShieldCheck, Sun, Thermometer, User, Waves } from 'lucide-react'
import MapaBebederos from './MapaBebederos'
import { datosEjemplo, estadoHidratacion, porcentajeSeguro } from './datosEjemplo'
import './InterfazPeon.css'

const numberFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

function InterfazPeon({ bebederos = datosEjemplo, usuario = 'Operador Campo', establecimiento = 'Estancia El Norte', onActualizar, cargando = false, error = '' }) {
  const titleId = useId()
  const [darkMode, setDarkMode] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [updates, setUpdates] = useState({})
  const [pending, setPending] = useState({})
  const [messages, setMessages] = useState({})
  const inFlight = useRef(new Set())
  const demo = bebederos === datosEjemplo
  const records = useMemo(() => bebederos.map((b) => ({ ...b, ...(updates[b.id]?.original === b ? updates[b.id].medicion : {}) })), [bebederos, updates])
  const temperatures = records.map((b) => b.temperatura).filter(Number.isFinite)
  const avgTemp = temperatures.length ? numberFormat.format(temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length) : '—'
  const measured = records.filter((b) => Number.isFinite(b.porcentaje)).length
  const cattle = new Set(records.filter((b) => b.caravana != null).map((b) => `${b.caravana}/${b.anioCaravana ?? ''}`)).size
  const risks = records.filter((b) => Number.isFinite(b.indiceHidratacion) && b.indiceHidratacion < 76).length
  const missingHydration = records.some((b) => !Number.isFinite(b.indiceHidratacion))

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  async function actualizar(bebedero) {
    if (inFlight.current.has(bebedero.id)) return
    inFlight.current.add(bebedero.id)
    setPending((previous) => ({ ...previous, [bebedero.id]: true }))
    setMessages((previous) => ({ ...previous, [bebedero.id]: '' }))
    try {
      let medicion
      if (onActualizar) {
        medicion = await onActualizar(bebedero.id)
        if (!medicion || typeof medicion !== 'object' || Array.isArray(medicion)) throw new Error('No se recibió una medición válida.')
      } else if (demo) {
        medicion = {
          porcentaje: Math.floor(Math.random() * 101),
          temperatura: Math.floor(Math.random() * 21) + 15,
          indiceHidratacion: Math.floor(Math.random() * 101),
        }
      } else {
        throw new Error('No hay una fuente de mediciones configurada.')
      }
      setUpdates((previous) => ({ ...previous, [bebedero.id]: { original: bebederos.find((b) => b.id === bebedero.id), medicion } }))
      setMessages((previous) => ({ ...previous, [bebedero.id]: demo && !onActualizar ? 'Medición de ejemplo simulada.' : 'Medición actualizada.' }))
    } catch (cause) {
      setMessages((previous) => ({ ...previous, [bebedero.id]: `${cause.message || 'No se pudo actualizar la medición.'} Intentá nuevamente.` }))
    } finally {
      inFlight.current.delete(bebedero.id)
      setPending((previous) => ({ ...previous, [bebedero.id]: false }))
    }
  }

  const stats = [
    { label: 'Bebederos Activos', value: `${measured} / ${records.length}`, detail: 'Con medición disponible', Icon: Droplets, color: 'agua' },
    { label: 'Ganado Monitoreado', value: cattle, detail: 'Caravanas en los registros', Icon: Award, color: 'ganado' },
    { label: 'Prom. Temperatura', value: `${avgTemp} °C`, detail: 'Promedio de las mediciones', Icon: Thermometer, color: 'clima' },
    { label: 'Estado General', value: risks ? 'Atención' : !records.length || missingHydration ? 'Sin datos' : 'Normal', detail: risks ? `${risks} con riesgo de hidratación` : 'Según registros disponibles', Icon: ShieldCheck, color: 'alertas' },
  ]

  return (
    <div className={`interfaz-peon${darkMode ? ' interfaz-peon--dark' : ''}`}>
      <header className="interfaz-peon__navbar">
        <div className="interfaz-peon__nav-container">
          <a href="/" className="interfaz-peon__brand"><span className="interfaz-peon__logo"><Droplets aria-hidden="true" /></span><span><strong>Proyecto bebederos</strong><small>Monitoreo Ganadero</small></span></a>
          <div className="interfaz-peon__nav-right">
            <span className="interfaz-peon__clock"><Clock size={17} aria-hidden="true" /><time dateTime={now.toISOString()}>{now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time></span>
            <button type="button" className="interfaz-peon__theme" onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'} aria-pressed={darkMode}>{darkMode ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}<span>Modo</span></button>
            <div className="interfaz-peon__user"><User aria-hidden="true" /><span><strong>{usuario}</strong><small>{establecimiento}</small></span></div>
          </div>
        </div>
      </header>

      <main className="interfaz-peon__main" aria-busy={cargando}>
        <header className="interfaz-peon__heading">
          <div><h1>Monitoreo de Bebederos</h1><p>Estado hídrico y telemetría de ganado</p><span className="interfaz-peon__system">{demo ? 'Datos de ejemplo · actualización simulada' : 'Resumen de las mediciones disponibles'}</span></div>
          <span className="interfaz-peon__date"><CalendarDays size={17} aria-hidden="true" />{now.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </header>

        <section className="interfaz-peon__stats" aria-label="Resumen de monitoreo">
          {stats.map(({ label, value, detail, Icon, color }) => <div className="interfaz-peon__stat" key={label}><span className={`interfaz-peon__stat-icon interfaz-peon__stat-icon--${color}`}><Icon aria-hidden="true" /></span><div><h2>{label}</h2><strong>{value}</strong><small>{detail}</small></div></div>)}
        </section>

        {cargando && <p role="status" className="interfaz-peon__notice">Cargando bebederos…</p>}
        {error && <p role="alert" className="interfaz-peon__notice">{error}</p>}

        <section aria-labelledby={titleId}>
          <h2 className="interfaz-peon__section-title" id={titleId}><Waves aria-hidden="true" /> Bebederos en Registro</h2>
          {!records.length && !cargando && <p className="interfaz-peon__notice">No hay bebederos registrados.</p>}
          <div className="interfaz-peon__cards">
            {records.map((b) => {
              const estado = estadoHidratacion(b.indiceHidratacion)
              const level = porcentajeSeguro(b.porcentaje)
              return <article className="interfaz-peon__card" key={b.id}>
                <header className="interfaz-peon__card-header"><div><h3><MapPin size={19} aria-hidden="true" />{b.ubicacion || 'Sin ubicación'}</h3><p>Bebedero Módulo #{b.id}</p></div><span className={`interfaz-peon__badge interfaz-peon__badge--${estado.clase}`}>{estado.texto}</span></header>
                <div className="interfaz-peon__level-heading"><span><Droplets size={16} aria-hidden="true" />Nivel de Agua</span><strong>{level == null ? '—' : `${level}%`}</strong></div>
                <div className={`interfaz-peon__progress interfaz-peon__progress--${level > 60 ? 'green' : level > 30 ? 'yellow' : 'red'}`} role="progressbar" aria-label={`Nivel de agua del bebedero ${b.id}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={level ?? undefined} aria-valuetext={level == null ? 'Sin medición' : `${level}%`}><span style={{ width: `${level ?? 0}%` }} /></div>
                <div className="interfaz-peon__telemetry"><span><Thermometer size={15} aria-hidden="true" />Temp: {Number.isFinite(b.temperatura) ? `${b.temperatura} °C` : '—'}</span><span><Activity size={15} aria-hidden="true" />Hidratación: {porcentajeSeguro(b.indiceHidratacion) ?? '—'}%</span></div>
                <dl className="interfaz-peon__details"><div><dt>Caravana</dt><dd>{b.caravana != null ? `${b.caravana}/${b.anioCaravana ?? '—'}` : '—'}</dd></div><div><dt>Última visita</dt><dd>{b.ultimaVisita || '—'}</dd></div><div><dt>Visitas hoy</dt><dd>{b.visitasHoy ?? '—'}</dd></div><div><dt>Tiempo bebiendo</dt><dd>{b.tiempoBebiendo || '—'}</dd></div></dl>
                <button className="interfaz-peon__update" type="button" disabled={pending[b.id] || cargando || (!demo && !onActualizar)} onClick={() => actualizar(b)}><RefreshCw size={17} aria-hidden="true" />{pending[b.id] ? 'Actualizando…' : 'Actualizar Medición'}</button>
                {messages[b.id] && <p className="interfaz-peon__message" role="status">{messages[b.id]}</p>}
              </article>
            })}
          </div>
        </section>

        <section className="interfaz-peon__map-card" aria-labelledby={`${titleId}-map`}>
          <div className="interfaz-peon__map-heading"><div><h2 id={`${titleId}-map`}><MapPin aria-hidden="true" />Ubicación en Terreno</h2><p>Geolocalización de puntos de agua y ganado</p></div><span className="interfaz-peon__system">{demo ? 'Ubicaciones de ejemplo' : 'Ubicaciones registradas'}</span></div>
          <MapaBebederos bebederos={records} />
        </section>
      </main>

      <footer className="interfaz-peon__footer"><strong>Proyecto bebederos</strong><span>© 2026 Todos los derechos reservados.</span></footer>
    </div>
  )
}

export default InterfazPeon
