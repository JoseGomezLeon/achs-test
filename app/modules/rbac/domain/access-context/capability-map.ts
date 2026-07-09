/**
 * Matrices canónicas BusinessRole → CapabilitySet.
 * Fuente de verdad: ADR-011 sección 2.2 (incorpora ADR-007 para el cierre mensual).
 *
 * Reglas de lectura:
 * - Una capability ausente es una denegación implícita (deny-by-default).
 * - liquidacion:ejecutar-cierre NO está aquí: es exclusiva del BatchJob PDN-PAG-001 (AgentRegistry).
 * - Un humano con múltiples BusinessRoles obtiene la UNIÓN de sus CapabilitySets.
 */

export type BusinessRole =
  'analista' | 'supervisor' | 'operador_pagos' | 'admin_gobernanza' | 'auditor'
export type ExternalRole = 'empleador'

export const humanCapabilityMap: Readonly<Record<BusinessRole, ReadonlySet<string>>> = {
  analista: new Set(['prestacion:otorgar', 'prestacion:denegar', 'prestacion:consultar']),

  supervisor: new Set([
    'liquidacion:aprobar-cierre', // ADR-007: aprueba pero NO ejecuta el cierre
    'liquidacion:consultar',
    'prestacion:consultar',
  ]),

  operador_pagos: new Set([
    'liquidacion:solicitar-cierre', // ADR-007: solicita pero NO puede auto-aprobar
    'liquidacion:calcular',
    'liquidacion:consultar',
  ]),

  auditor: new Set(['auditoria:leer']),

  admin_gobernanza: new Set([
    'auditoria:leer',
    'liquidacion:aprobar-cierre',
    'liquidacion:solicitar-cierre',
    'liquidacion:consultar',
    'prestacion:otorgar',
    'prestacion:denegar',
    'prestacion:consultar',
    'rbac:administrar',
    'agente:gestionar-sesion-dev',
  ]),
} as const

export const externalCapabilityMap: Readonly<Record<ExternalRole, ReadonlySet<string>>> = {
  empleador: new Set(['hecho-causal:consultar-estado']),
} as const
