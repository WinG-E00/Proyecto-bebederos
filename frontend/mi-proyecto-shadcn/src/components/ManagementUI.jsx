import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, MapPin, Search, X } from 'lucide-react'
import MapaBebederos from '../pages/interfazPeon/MapaBebederos.jsx'
import './ManagementUI.css'

export function MetricCard({ icon: Icon, label, value, detail, tone = 'green', to }) {
  const Element = to ? Link : 'article'
  return <Element className="metric-card" {...(to ? { to } : {})}>
    <span className={`metric-icon ${tone}`}><Icon size={21} aria-hidden="true" /></span>
    <div><p>{label}</p><strong>{value ?? '—'}</strong>{detail && <small>{detail}</small>}</div>
    {to && <ChevronRight size={17} aria-hidden="true" />}
  </Element>
}

export function ResourceToolbar({ search, onSearch, label, count, onRefresh, refreshing, paginated = false }) {
  return <div className="farm-toolbar">
    <label className="search farm-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label={label} placeholder={label} value={search} onChange={event => onSearch(event.target.value)} /></label>
    <button type="button" className="secondary-button" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'Actualizando…' : 'Actualizar'}</button>
    <span role="status">{count} {count === 1 ? 'resultado' : 'resultados'}{paginated ? ' en esta página' : ''}</span>
  </div>
}

export function ResourceMap({ scope, type, title, description }) {
  const suffix = scope.farmId ? `?farmId=${scope.farmId}` : ''
  return <section className="panel trough-map-panel">
    <header className="panel-title"><div><h2>{title}</h2><p>{description || scope.selected?.name || 'Todos los establecimientos'}</p></div><MapPin size={19} aria-hidden="true" /></header>
    <div className="management-map"><MapaBebederos farmId={scope.farmId} center={scope.selected} compact resourceType={type} /></div>
    <footer className="map-footer"><span>Consultá la última ubicación recibida y abrí su ficha.</span><Link className="text-button" to={`/map${suffix}`}>Abrir mapa completo <ChevronRight size={16} aria-hidden="true" /></Link></footer>
  </section>
}

export function EmptyResources({ icon: Icon, title, description }) {
  return <section className="state-card" role="status"><span className="empty-icon"><Icon size={28} aria-hidden="true" /></span><h2>{title}</h2>{description && <p>{description}</p>}</section>
}

// El diálogo nativo conserva el foco y permite cerrar con Escape.
export function ResourceFormDialog({ title, onClose, children }) {
  const dialog = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const previous = document.activeElement
    const element = dialog.current
    element.showModal()
    element.querySelector('input')?.focus()
    return () => { element.close(); previous?.focus() }
  }, [])
  function close(event) {
    event?.preventDefault()
    if (!dialog.current.querySelector('button[type="submit"]:disabled, form button:disabled')) onClose()
  }
  return <dialog ref={dialog} className="resource-form-dialog" aria-labelledby={titleId} onCancel={close}>
    <div className="modal-header"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="Cerrar formulario" onClick={close}><X size={19} aria-hidden="true" /></button></div>
    {children}
  </dialog>
}
