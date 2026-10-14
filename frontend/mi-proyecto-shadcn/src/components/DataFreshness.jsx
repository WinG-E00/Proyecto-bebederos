import { formatDate } from '../lib/dates.js'
export default function DataFreshness({ value, date }) {
  return (
    <p>
      {value === 'missing'
        ? 'Sin datos recibidos'
        : value === 'stale'
          ? 'Datos desactualizados'
          : 'Datos vigentes'}
      {date && ` · ${formatDate(date)}`}
    </p>
  )
}
