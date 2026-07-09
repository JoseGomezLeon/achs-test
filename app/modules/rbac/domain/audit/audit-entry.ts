/**
 * Registro inmutable de una decisión de autorización.
 * Se persiste en app_audit como insert-only (ADR-008).
 */
export type AuditEntry = {
  readonly actorKind: 'human' | 'agent' | 'external'
  readonly actorId: string
  readonly capability: string
  readonly outcome: 'granted' | 'denied'
  readonly happenedAt: string // ISO 8601

  readonly resourceType?: string
  readonly resourceId?: string
  readonly denialReason?: string
  readonly requestId?: string

  // Agent-specific
  readonly agentType?: string
  readonly operation?: string
  readonly environment?: string
  readonly entraClientId?: string
  readonly invokedBy?: string
}
