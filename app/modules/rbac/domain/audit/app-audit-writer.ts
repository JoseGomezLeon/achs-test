import type { AuditEntry } from './audit-entry.js'

/**
 * Frontera con el sistema de auditoría. Insert-only — sin UPDATE ni DELETE.
 * Ver ADR-008 para el modelo de datos y el trigger de protección.
 */
export interface AppAuditWriter {
  write(entry: AuditEntry): Promise<void>
}
