export const datosEjemplo = [
  { id: 1, ubicacion: 'Casa', porcentaje: 85, temperatura: 22, indiceHidratacion: 84, tiempoBebiendo: '1 min 48 s', visitasHoy: 6, ultimaVisita: '14:35', caravana: 2548, anioCaravana: 2024, lat: -26.215246, lng: -58.970338 },
  { id: 2, ubicacion: 'Medio', porcentaje: 40, temperatura: 26, indiceHidratacion: 48, tiempoBebiendo: '58 s', visitasHoy: 3, ultimaVisita: '12:10', caravana: 3171, anioCaravana: 2023, lat: -26.225179, lng: -58.96781 },
  { id: 3, ubicacion: 'Zalinas', porcentaje: 20, temperatura: 30, indiceHidratacion: 31, tiempoBebiendo: '25 s', visitasHoy: 2, ultimaVisita: '09:40', caravana: 4156, anioCaravana: 2022, lat: -26.275742, lng: -58.969547 },
]

export function estadoHidratacion(indice) {
  if (!Number.isFinite(indice)) return { texto: 'Sin medición', clase: 'sin-datos' }
  if (indice >= 76) return { texto: 'Hidratación adecuada', clase: 'verde' }
  if (indice >= 51) return { texto: 'Riesgo bajo', clase: 'amarillo' }
  if (indice >= 26) return { texto: 'Riesgo moderado', clase: 'naranja' }
  return { texto: 'Riesgo alto', clase: 'rojo' }
}

export function porcentajeSeguro(valor) {
  return Number.isFinite(valor) ? Math.min(100, Math.max(0, valor)) : null
}
