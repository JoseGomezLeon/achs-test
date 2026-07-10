import { describe, it, expect } from 'vitest'
import {
  humanCapabilityMap,
  externalCapabilityMap,
} from '../../../app/modules/rbac/domain/access-context/capability-map.js'

describe('humanCapabilityMap', () => {
  it('analista tiene prestacion:otorgar', () => {
    expect(humanCapabilityMap.analista.has('prestacion:otorgar')).toBe(true)
  })
  it('analista tiene prestacion:denegar', () => {
    expect(humanCapabilityMap.analista.has('prestacion:denegar')).toBe(true)
  })
  it('analista NO tiene liquidacion:cerrar-ciclo', () => {
    expect(humanCapabilityMap.analista.has('liquidacion:cerrar-ciclo')).toBe(false)
  })
  it('auditor solo tiene lectura', () => {
    expect(humanCapabilityMap.auditor.has('auditoria:leer')).toBe(true)
    expect(humanCapabilityMap.auditor.has('prestacion:otorgar')).toBe(false)
    expect(humanCapabilityMap.auditor.has('liquidacion:calcular')).toBe(false)
  })
  it('supervisor puede cerrar ciclo', () => {
    expect(humanCapabilityMap.supervisor.has('liquidacion:cerrar-ciclo')).toBe(true)
  })
  it('supervisor NO puede calcular liquidacion directamente', () => {
    expect(humanCapabilityMap.supervisor.has('liquidacion:calcular')).toBe(false)
  })
  it('operador_pagos puede calcular liquidacion', () => {
    expect(humanCapabilityMap.operador_pagos.has('liquidacion:calcular')).toBe(true)
  })
  it('operador_pagos NO puede otorgar prestacion', () => {
    expect(humanCapabilityMap.operador_pagos.has('prestacion:otorgar')).toBe(false)
  })
  it('admin_gobernanza tiene todas las capacidades criticas', () => {
    expect(humanCapabilityMap.admin_gobernanza.has('auditoria:leer')).toBe(true)
    expect(humanCapabilityMap.admin_gobernanza.has('liquidacion:cerrar-ciclo')).toBe(true)
    expect(humanCapabilityMap.admin_gobernanza.has('prestacion:otorgar')).toBe(true)
  })
})

describe('externalCapabilityMap', () => {
  it('empleador puede consultar hecho causal', () => {
    expect(externalCapabilityMap.empleador.has('hecho-causal:consultar-estado')).toBe(true)
  })
  it('empleador NO puede otorgar prestacion', () => {
    expect(externalCapabilityMap.empleador.has('prestacion:otorgar')).toBe(false)
  })
})
