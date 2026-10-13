import { vi } from 'vitest'

// Inyectar estas dependencias en los servicios futuros; nunca llamar proveedores reales.
export function controlledProviders(now = '2026-10-13T12:00:00.000Z') {
  let current = new Date(now)
  return {
    clock: { now: () => new Date(current), set: (value) => { current = new Date(value) } },
    smtp: { sendMail: vi.fn().mockResolvedValue({ messageId: 'test-only', accepted: ['worker@test.invalid'] }) },
    weather: { fetch: vi.fn().mockResolvedValue({ temperatureC: 24, humidityPercent: 60, condition: 'Despejado', rainProbabilityPercent: 10 }) },
  }
}
