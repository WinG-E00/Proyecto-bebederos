import { Button } from './ui/button.jsx'

export default function AsyncState({ loading = false, error = null, empty = false, onRetry, emptyMessage = 'No hay datos disponibles.', children }) {
  if (loading) return <p role="status" aria-live="polite">Cargando…</p>
  if (error) return <div role="alert" className="rounded-lg border border-border bg-card p-4 text-card-foreground">
    <p>{error.status === 403 || error.status === 404 ? 'Ya no tenés acceso a estos datos.' : error.message || 'No se pudieron cargar los datos.'}</p>
    {onRetry && <Button className="mt-3 min-h-11" variant="outline" onClick={onRetry}>Reintentar</Button>}
  </div>
  if (empty) return <p role="status">{emptyMessage}</p>
  return children
}
