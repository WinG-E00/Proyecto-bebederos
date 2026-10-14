import { it, expect } from 'vitest'
import { Sequelize } from 'sequelize'
import { registerModels } from '../../models/index.js'
import {
  farmPatchSchema,
  troughSchema,
  animalPatchSchema,
} from '../../services/resource.schemas.js'
it('registra modelos sin sync/conexión y valida administración y telemetría', async () => {
  const db = new Sequelize('unused', 'unused', 'unused', { dialect: 'mysql', logging: false })
  const m = registerModels(db)
  expect(Object.keys(m)).toEqual(
    expect.arrayContaining([
      'Farm',
      'Animal',
      'AnimalPosition',
      'AnimalState',
      'EstimatedVisit',
      'Trough',
      'TroughState',
      'WaterReading',
      'TroughPosition',
    ]),
  )
  await expect(
    m.Animal.build({
      farmId: 1,
      name: 'A',
      species: 'Bovino',
      breed: 'Angus',
      ageYears: -1,
      state: 'Activo',
    }).validate(),
  ).rejects.toThrow()
  await expect(
    m.WaterReading.build({
      sourceKey: 'w',
      troughId: 1,
      percentage: 101,
      measuredAt: new Date(),
      receivedAt: new Date(),
    }).validate(),
  ).rejects.toThrow()
  await expect(
    m.Trough.build({
      farmId: 1,
      name: 'B',
      capacityLiters: 1,
      latitude: 0,
      longitude: null,
    }).validate(),
  ).rejects.toThrow()
  expect(farmPatchSchema.parse({ areaHa: 0 })).toEqual({ areaHa: 0 })
  expect(animalPatchSchema.safeParse({ latitude: 0 }).success).toBe(false)
  expect(troughSchema.safeParse({ name: 'B', capacityLiters: 1, latitude: 0 }).success).toBe(false)
  await db.close()
})
