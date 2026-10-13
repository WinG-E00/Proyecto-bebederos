import { useEffect, useId, useRef, useState } from 'react'
import { Button } from './ui/button.jsx'

export default function ConfirmAction({ open, title, description, confirmLabel = 'Confirmar', onConfirm, onCancel }) {
  const dialog = useRef(null)
  const cancel = useRef(null)
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const titleId = useId(); const descriptionId = useId()
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const element = dialog.current
    element.showModal()
    cancel.current?.focus()
    return () => { element.close(); previous?.focus() }
  }, [open])
  async function confirm() {
    if (busy.current) return
    busy.current = true; setPending(true); setError('')
    try { await onConfirm() } catch (cause) { setError(cause.message || 'No se pudo completar la acción. Intentá nuevamente.') }
    finally { busy.current = false; setPending(false) }
  }
  return <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId} aria-busy={pending}
    className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg backdrop:bg-black/50"
    onCancel={(event) => { event.preventDefault(); if (!busy.current) { setError(''); onCancel() } }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return
      const controls = [...dialog.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')]
        .filter((element) => !element.disabled)
      if (!controls.length) { event.preventDefault(); return }
      const first = controls[0]; const last = controls.at(-1)
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
        event.preventDefault(); first.focus()
      }
    }}>
    <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
    <p id={descriptionId} className="mt-2">{description}</p>
    {error && <p role="alert" className="mt-3">{error}</p>}
    <div className="mt-5 flex flex-wrap justify-end gap-3">
      <Button ref={cancel} className="min-h-11" variant="outline" disabled={pending} onClick={() => { setError(''); onCancel() }}>Cancelar</Button>
      <Button className="min-h-11" variant="destructive" disabled={pending} onClick={confirm}>{pending ? 'Procesando…' : confirmLabel}</Button>
    </div>
  </dialog>
}
