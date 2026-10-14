import { useState } from 'react'
export default function FarmForm({ initial, onSave, onCancel }) {
  const [values, setValues] = useState(
    initial ?? {
      name: '',
      latitude: '',
      longitude: '',
      areaHa: '',
      description: '',
      staleMinutes: 180,
      timezone: 'America/Argentina/Buenos_Aires',
    },
  )
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const { name, latitude, longitude, areaHa, description, staleMinutes, timezone } = values
      await onSave({
        name,
        latitude: Number(latitude),
        longitude: Number(longitude),
        areaHa: Number(areaHa),
        description,
        staleMinutes: Number(staleMinutes),
        timezone,
      })
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2"
    >
      {[
        ['name', 'Nombre', 'text'],
        ['latitude', 'Latitud', 'number', -90, 90],
        ['longitude', 'Longitud', 'number', -180, 180],
        ['areaHa', 'Superficie (ha)', 'number', 0],
        ['staleMinutes', 'Antigüedad máxima (minutos)', 'number', 1],
        ['timezone', 'Zona horaria IANA', 'text'],
        ['description', 'Descripción', 'text'],
      ].map(([key, label, type, min, max]) => (
        <label key={key} className="grid gap-1">
          {label}
          <input
            required={key !== 'description'}
            className="min-h-11 rounded-lg border border-border bg-background p-2"
            type={type}
            min={min}
            max={max}
            step={key === 'staleMinutes' ? 1 : 'any'}
            value={values[key]}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            aria-invalid={!!error?.fields?.[key]}
            aria-describedby={error?.fields?.[key] ? `farm-${key}-error` : undefined}
          />
          {error?.fields?.[key] && <span id={`farm-${key}-error`}>{error.fields[key]}</span>}
        </label>
      ))}
      {error && <p role="alert">{error.message}</p>}
      <div className="flex gap-3">
        <button className="min-h-11 rounded-lg bg-[#198754] px-4 text-white" disabled={pending}>
          {pending ? 'Guardando…' : 'Guardar establecimiento'}
        </button>
        <button type="button" className="min-h-11 px-3" disabled={pending} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
