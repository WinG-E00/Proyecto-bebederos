import { it, expect } from 'vitest'
import { freshness, waterCategory } from '../../services/water.service.js'
import { farmPatchSchema } from '../../services/resource.schemas.js'
it('vence solo después del límite; ausencia independiente del nivel cero', () => {
  const measured = new Date('2026-10-13T12:00:00Z')
  for (const minutes of [1, 180, 300]) {
    expect(freshness(measured, minutes, new Date(+measured + minutes * 60000))).toBe('fresh')
    expect(freshness(measured, minutes, new Date(+measured + minutes * 60000 + 1))).toBe('stale')
  }
  expect(freshness(null, 180)).toBe('missing')
  expect([0,19,20,50,51,100].map(waterCategory)).toEqual(['Crítico','Crítico','Bajo','Bajo','Normal','Normal'])
  for (const staleMinutes of [null,0,-1,1.5]) expect(farmPatchSchema.safeParse({staleMinutes}).success).toBe(false)
})

import { alertConditions } from '../../services/alerts.service.js'
it('nivel y vigencia coexisten; GPS y ausencia no inventan mediciones',()=>{
 const now=new Date('2026-10-13T12:00:00Z'), measuredAt=new Date(+now-181*60000)
 expect(alertConditions('trough',{percentage:0,measuredAt},180,now)).toEqual(['water_stale','water_critical'])
 expect(alertConditions('trough',{},180,now)).toEqual(['water_missing'])
 expect(alertConditions('animal',{measuredAt},180,now)).toEqual(['gps_stale'])
 expect(alertConditions('trough',{percentage:51,measuredAt:now},180,now)).toEqual([])
})
