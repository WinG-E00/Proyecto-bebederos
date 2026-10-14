import { useId, useState } from 'react'
export default function AdministrativeForm({
  fields,
  initial = {},
  onSave,
  onCancel,
  label,
}) {
  const formId = useId()
  const [values, setValues] = useState(initial)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  async function submit(e) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const body = {}
      for (const [key, , type] of fields) {
        const v = values[key] ?? ''
        if (type === 'optionalNumber') {
          if (v !== '') body[key] = Number(v)
        } else body[key] = type === 'number' ? Number(v) : v
      }
      await onSave(body)
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2"
      onSubmit={submit}
    >
      {fields.map(([key, title, type, min, max, options]) => (
        <label key={key} className="grid gap-1">
          {title}
          {options ? (
            <select
              className="min-h-11 rounded-lg border bg-background p-2"
              value={values[key] ?? ''}
              onChange={(e) =>
                setValues((v) => ({ ...v, [key]: e.target.value }))
              }
              required
              aria-invalid={!!error?.fields?.[key]}
              aria-describedby={
                error?.fields?.[key] ? `${formId}-${key}` : undefined
              }
            >
              <option value="">Seleccionar</option>
              {options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              className="min-h-11 rounded-lg border bg-background p-2"
              required={type !== 'optionalNumber'}
              value={values[key] ?? ''}
              onChange={(e) =>
                setValues((v) => ({ ...v, [key]: e.target.value }))
              }
              type={type === 'text' ? 'text' : 'number'}
              min={min}
              max={max}
              step="any"
              aria-invalid={!!error?.fields?.[key]}
              aria-describedby={
                error?.fields?.[key] ? `${formId}-${key}` : undefined
              }
            />
          )}{' '}
          {error?.fields?.[key] && (
            <span id={`${formId}-${key}`}>{error.fields[key]}</span>
          )}
        </label>
      ))}
      {error && <p role="alert">{error.message}</p>}
      <div className="flex gap-3">
        <button
          className="min-h-11 rounded-lg bg-[#198754] px-4 text-white"
          disabled={pending}
        >
          {pending ? 'Guardando…' : label}
        </button>
        <button
          className="min-h-11 px-3"
          type="button"
          disabled={pending}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
