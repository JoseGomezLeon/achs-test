import type { AppAuditWriter } from '../../app/modules/rbac/domain/audit/app-audit-writer.js'
import type { AuditEntry } from '../../app/modules/rbac/domain/audit/audit-entry.js'

/**
 * Implementación stub de AppAuditWriter para unit tests.
 * Almacena las entradas en memoria — sin persistencia ni I/O.
 * Permite verificar que las auditorías se emitieron correctamente.
 */
export class StubAuditWriter implements AppAuditWriter {
  private readonly _entries: AuditEntry[] = []

  async write(entry: AuditEntry): Promise<void> {
    this._entries.push(entry)
  }

  /** Todas las entradas escritas desde la instanciación o último reset. */
  get entries(): readonly AuditEntry[] {
    return this._entries
  }

  /** Entradas filtradas por capability. */
  entriesFor(capability: string): readonly AuditEntry[] {
    return this._entries.filter((e) => e.capability === capability)
  }

  /** Limpia las entradas — útil entre test cases. */
  reset(): void {
    this._entries.length = 0
  }
}
