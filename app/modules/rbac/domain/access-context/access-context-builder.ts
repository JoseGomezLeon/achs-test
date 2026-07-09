import type { TokenClaims } from '../iam/token-claims.js'
import { humanCapabilityMap, externalCapabilityMap } from './capability-map.js'

export const ENTRA_GROUP_TO_ROLE: Record<string, keyof typeof humanCapabilityMap> = {
  'achs-analistas':        'analista',
  'achs-supervisores':     'supervisor',
  'achs-operadores-pago':  'operador_pagos',
  'achs-admin-gobernanza': 'admin_gobernanza',
  'achs-auditores':        'auditor',
}

export type Subject =
  | { kind: 'human';    userId: string; orgUnit: string }
  | { kind: 'agent';    appId: string  }
  | { kind: 'external'; sub: string    }

export class AccessContext {
  constructor(
    readonly subject: Subject,
    readonly capabilities: ReadonlySet<string>
  ) {}

  can(capability: string): boolean {
    return this.capabilities.has(capability)
  }
}

export class AccessContextBuilder {
  static fromClaims(claims: TokenClaims): AccessContext {
    // Sujeto externo
    if (claims.achs_subject_kind === 'external') {
      const type = claims.achs_external_type ?? ''
      const caps = externalCapabilityMap[type as keyof typeof externalCapabilityMap] ?? new Set()
      return new AccessContext({ kind: 'external', sub: claims.sub ?? '' }, caps)
    }

    // Agente (Client Credentials: tiene appId/azp pero no oid humano con groups)
    if ((claims.appId || claims.azp) && !claims.groups) {
      const caps = new Set<string>(claims.roles ?? [])
      return new AccessContext({ kind: 'agent', appId: claims.appId ?? claims.azp ?? '' }, caps)
    }

    // Humano
    const roles = (claims.groups ?? [])
      .map(g => ENTRA_GROUP_TO_ROLE[g])
      .filter((r): r is keyof typeof humanCapabilityMap => r !== undefined)

    const caps = new Set<string>()
    for (const role of roles) {
      for (const cap of humanCapabilityMap[role]) {
        caps.add(cap)
      }
    }

    return new AccessContext(
      { kind: 'human', userId: claims.oid ?? '', orgUnit: claims.extension_orgUnit ?? '' },
      caps
    )
  }
}
