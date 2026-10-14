export const formatDate = (value, timeZone) =>
  value ? new Date(value).toLocaleString('es-AR', { timeZoneName: 'short', ...(timeZone ? {timeZone} : {}) }) : 'Sin datos recibidos'
