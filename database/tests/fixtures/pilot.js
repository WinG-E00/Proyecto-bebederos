// Fixture reproducible del piloto: 2 dueños, 1 peón compartido, 10 campos,
// 100 bebederos y 1.000 animales. Determinista: mismos nombres y coordenadas en cada ejecución.
export const PILOT = Object.freeze({ farms: 10, troughsPerFarm: 10, animalsPerFarm: 100 })
export const PILOT_DOMAIN = 'bebederos-piloto.invalid'

export const pilotAccounts = Object.freeze([
  { key: 'ownerA', name: 'Dueña Piloto A', email: `duenio-a@${PILOT_DOMAIN}`, role: 'owner' },
  { key: 'ownerB', name: 'Dueño Piloto B', email: `duenio-b@${PILOT_DOMAIN}`, role: 'owner' },
  { key: 'worker', name: 'Peón Piloto Compartido', email: `peon@${PILOT_DOMAIN}`, role: 'worker' },
])

const BASE = { latitude: -26.2, longitude: -58.97 }
const round = (value) => Math.round(value * 1e6) / 1e6

// Campos 1–6 del dueño A, 7–10 del dueño B. El peón comparte el primer campo de cada dueño.
export function pilotPlan() {
  return Array.from({ length: PILOT.farms }, (_, f) => {
    const index = f + 1
    const owner = index <= 6 ? 'ownerA' : 'ownerB'
    const latitude = round(BASE.latitude - f * 0.05)
    const longitude = round(BASE.longitude + f * 0.05)
    return {
      owner,
      sharedWithWorker: index === 1 || index === 7,
      farm: {
        name: `Campo piloto ${String(index).padStart(2, '0')}`, latitude, longitude, areaHa: 250 + f * 25,
        description: 'Datos de prueba del piloto (seed).', staleMinutes: 180, timezone: 'America/Argentina/Buenos_Aires',
      },
      troughs: Array.from({ length: PILOT.troughsPerFarm }, (_, t) => ({
        name: `B${String(index).padStart(2, '0')}-${String(t + 1).padStart(2, '0')}`,
        capacityLiters: 500 + (t % 3) * 250, operationalState: t === 9 ? 'En mantenimiento' : 'Operativo',
        latitude: round(latitude + (t % 5) * 0.002), longitude: round(longitude + Math.floor(t / 5) * 0.002),
      })),
      animals: Array.from({ length: PILOT.animalsPerFarm }, (_, a) => ({
        name: `A${String(index).padStart(2, '0')}-${String(a + 1).padStart(3, '0')}`,
        species: 'Bovino', breed: ['Angus', 'Hereford', 'Brangus', 'Braford'][a % 4], ageYears: 1 + (a % 8), state: 'Activo',
      })),
    }
  })
}

// Nivel inicial determinista que cubre Normal, Bajo, Crítico y extremos 0/20/50/100.
export function pilotWaterLevel(farmIndex, troughIndex) {
  const levels = [100, 85, 62, 50, 49, 35, 20, 19, 5, 0]
  return levels[(farmIndex + troughIndex) % levels.length]
}
