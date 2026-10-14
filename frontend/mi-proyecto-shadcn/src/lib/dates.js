export const formatDate = (value) =>
  value ? new Date(value).toLocaleString('es-AR', { timeZoneName: 'short' }) : 'Sin datos recibidos'
