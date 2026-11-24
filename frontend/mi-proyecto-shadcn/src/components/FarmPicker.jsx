import { Fence, Layers, MapPin } from 'lucide-react'
import './FarmPicker.css'

// Con muchos campos los botones ocuparían demasiado; se pasa a un desplegable.
const MAX_CHIPS = 6

export default function FarmPicker({ farms, value, onChange, label = 'Establecimiento del mapa' }) {
  if (!farms.length) return null
  const selected = farms.find(f => String(f.id) === String(value))
  return (
    <section className="farm-picker" aria-label="Elegir establecimiento">
      <div className="farm-picker-copy">
        <span className="farm-picker-icon"><Fence size={20} aria-hidden="true" /></span>
        <div><p>Estás viendo</p><strong>{selected?.name ?? 'Todos los establecimientos'}</strong></div>
      </div>
      {farms.length <= MAX_CHIPS ? (
        <div className="farm-chips" role="group" aria-label={label}>
          <button type="button" className="farm-chip farm-chip--all" aria-pressed={!value} onClick={() => onChange('')}>
            <Layers size={17} aria-hidden="true" />Todos los establecimientos
          </button>
          {farms.map(f => (
            <button key={f.id} type="button" className="farm-chip" aria-pressed={String(f.id) === String(value)} onClick={() => onChange(String(f.id))}>
              <MapPin size={16} aria-hidden="true" />{f.name}
            </button>
          ))}
        </div>
      ) : (
        <label className="farm-select">
          <span>{label}</span>
          <select value={value} onChange={e => onChange(e.target.value)}>
            <option value="">Todos los establecimientos</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
      )}
    </section>
  )
}
