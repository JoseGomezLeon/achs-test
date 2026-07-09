/**
 * IoC container RBAC — selecciona implementaciones según TEST_MODE.
 *
 * TEST_MODE=architecture  → stubs en memoria, sin IO real (tests unitarios, CI rápido)
 * TEST_MODE=implementation → clientes reales contra servicios locales (integración)
 * (producción)            → OidcIamAdapter + AppAuditWriterService (Lucid)
 *
 * Ver ADR-011 sección 1 para la descripción de cada sistema externo y su stub.
 */

import type { IamAdapter } from '../app/modules/rbac/domain/iam/iam-adapter.js'
import type { AppAuditWriter } from '../app/modules/rbac/domain/audit/app-audit-writer.js'

export type RbacBindings = {
  iamAdapter: IamAdapter
  auditWriter: AppAuditWriter
}

export async function buildRbacBindings(): Promise<RbacBindings> {
  const mode = process.env.TEST_MODE ?? 'production'

  if (mode === 'architecture') {
    const [{ StubIamAdapter }, { StubAuditWriter }] = await Promise.all([
      import('../tests/stubs/stub-iam-adapter.js'),
      import('../tests/stubs/stub-audit-writer.js'),
    ])
    return {
      iamAdapter: new StubIamAdapter(),
      auditWriter: new StubAuditWriter(),
    }
  }

  if (mode === 'implementation') {
    // Clientes reales contra servicios locales (Testcontainers, mock OIDC)
    // Se implementan en la fase de integración (p4t*).
    throw new Error('TEST_MODE=implementation: clientes reales no implementados aún (fase p4)')
  }

  // Producción — OidcIamAdapter + AppAuditWriterService
  // Se implementan en la fase F2 (fuera del scope del piloto F0/F1).
  throw new Error('Producción: OidcIamAdapter no implementado aún (fase F2)')
}
