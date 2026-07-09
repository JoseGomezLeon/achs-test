import type { IamAdapter } from '../../app/modules/rbac/domain/iam/iam-adapter.js'
import { AuthenticationError } from '../../app/modules/rbac/domain/iam/iam-adapter.js'
import type { TokenClaims } from '../../app/modules/rbac/domain/iam/token-claims.js'

/**
 * Implementación stub de IamAdapter para unit tests y desarrollo rápido.
 * No hay criptografía — el "token" es un string determinista que mapea a TokenClaims.
 *
 * Formato de tokens definido en ADR-011 sección 1.3:
 *   analista-<orgUnit>    → HumanSubject analista
 *   supervisor-full       → HumanSubject supervisor
 *   operador-pagos        → HumanSubject operador_pagos
 *   auditor               → HumanSubject auditor
 *   admin-gobernanza      → HumanSubject admin_gobernanza
 *   job-pdn-pag-001       → AgentSubject BatchJob PDN-PAG-001
 *   agent-afk-<tsId>      → AgentSubject AFK
 *   external-empleador    → ExternalSubject empleador
 */
export class StubIamAdapter implements IamAdapter {
  async authenticate(token: string): Promise<TokenClaims> {
    const fixture = STUB_FIXTURES[token]
    if (!fixture) {
      throw new AuthenticationError(`StubIamAdapter: token desconocido — "${token}"`)
    }
    return fixture
  }
}

const STUB_FIXTURES: Record<string, TokenClaims> = {
  'analista-rm-norte': {
    oid: 'stub-user-analista-rm-norte',
    email: 'analista-rm-norte@achs.cl',
    groups: ['achs-analistas'],
    extension_orgUnit: 'RM-Norte',
  },
  'analista-rm-sur': {
    oid: 'stub-user-analista-rm-sur',
    email: 'analista-rm-sur@achs.cl',
    groups: ['achs-analistas'],
    extension_orgUnit: 'RM-Sur',
  },
  'supervisor-full': {
    oid: 'stub-user-supervisor-full',
    email: 'supervisor@achs.cl',
    groups: ['achs-supervisores'],
    extension_orgUnit: '*',
  },
  'operador-pagos': {
    oid: 'stub-user-operador-pagos',
    email: 'operador-pagos@achs.cl',
    groups: ['achs-operadores-pago'],
    extension_orgUnit: 'RM-Norte',
  },
  'auditor': {
    oid: 'stub-user-auditor',
    email: 'auditor@achs.cl',
    groups: ['achs-auditores'],
    extension_orgUnit: '*',
  },
  'admin-gobernanza': {
    oid: 'stub-user-admin-gobernanza',
    email: 'admin-gobernanza@achs.cl',
    groups: ['achs-admin-gobernanza'],
    extension_orgUnit: '*',
  },
  'job-pdn-pag-001': {
    appId: 'pec2-job-pdn-pag-001',
    azp: 'pec2-job-pdn-pag-001',
    oid: 'sp-pdn-pag-001',
    roles: [
      'job:ejecutar-ciclo-pago',
      'liquidacion:calcular',
      'liquidacion:consultar',
      'liquidacion:generar-archivos',
      'liquidacion:ejecutar-cierre',
      'calculo:ejecutar',
      'marco:resolver',
      'incidente:crear-automatico',
    ],
    environment: 'test',
  },
  'agent-afk-ts06': {
    appId: 'pec2-agent-afk-dev',
    azp: 'pec2-agent-afk-dev',
    oid: 'sp-afk-dev',
    roles: ['calculo:ejecutar', 'prestacion:consultar'],
    environment: 'dev',
  },
  'external-empleador': {
    sub: 'empleador-ext-stub-001',
    achs_subject_kind: 'external',
    achs_external_type: 'empleador',
  },
}
