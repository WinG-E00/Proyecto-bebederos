import { useState } from 'react'
import { Button } from '../../src/components/ui/button.jsx'
import AsyncState from '../../src/components/AsyncState.jsx'
import ConfirmAction from '../../src/components/ConfirmAction.jsx'

export default function ComponentReview() {
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  return <main className="mx-auto max-w-xl p-6">
    <h1 className="mb-4 text-xl font-semibold">Componentes comunes — datos de prueba</h1>
    <AsyncState loading />
    <AsyncState empty emptyMessage="Sin recursos de prueba" />
    <AsyncState error={{ message: 'Conexión de prueba no disponible.' }} onRetry={() => {}} />
    <Button className="mt-4 min-h-11" onClick={() => setOpen(true)}>Retirar recurso de prueba</Button>
    {confirmed && <p role="status">Confirmación de prueba registrada.</p>}
    <ConfirmAction open={open} title="Retirar bebedero" description="El historial se conserva. No se retira ningún recurso real en esta revisión."
      confirmLabel="Retirar" onCancel={() => setOpen(false)} onConfirm={async () => { setConfirmed(true); setOpen(false) }} />
  </main>
}
