import { setWorldConstructor, World, type IWorldOptions } from '@cucumber/cucumber'
import { StubIamAdapter } from '../../stubs/stub-iam-adapter.js'
import { StubAuditWriter } from '../../stubs/stub-audit-writer.js'
import type { TokenClaims } from '../../../app/modules/rbac/domain/iam/token-claims.js'
import { AuthenticationError } from '../../../app/modules/rbac/domain/iam/iam-adapter.js'
import {
  AccessContextBuilder,
  AccessContext,
  ENTRA_GROUP_TO_ROLE,
} from '../../../app/modules/rbac/domain/access-context/access-context-builder.js'
import type { BusinessRole } from '../../../app/modules/rbac/domain/access-context/capability-map.js'
import type { AuditEntry } from '../../../app/modules/rbac/domain/audit/audit-entry.js'

export type SubjectKind = 'human' | 'agent' | 'external'

export type ResolvedSubject = {
  kind: SubjectKind
  claims: TokenClaims
  capabilities: ReadonlySet<string>
  orgUnit?: string
  role?: BusinessRole
  externalType?: string
  operation?: string
}

type CloseState = { requestedBy?: string; approvedBy?: string }

export class RbacWorld extends World {
  readonly iamAdapter = new StubIamAdapter()
  readonly auditWriter = new StubAuditWriter()

  subject: ResolvedSubject | null = null
  lastError: Error | null = null
  lastAccessResult: 'granted' | 'denied' | null = null
  lastDenialCode: string | null = null

  // state for double-signature cierre-mensual scenarios
  private closeStates = new Map<string, CloseState>()
  currentPeriod: string | null = null
  // resources with orgUnit for relation-context scenarios
  private resources = new Map<string, { orgUnit: string }>()

  constructor(opts: IWorldOptions) {
    super(opts)
  }

  async authenticate(token: string): Promise<void> {
    this.lastError = null
    this.subject = null
    try {
      const claims = await this.iamAdapter.authenticate(token)
      const ctx = AccessContextBuilder.fromClaims(claims)
      this.subject = this.#toResolvedSubject(ctx, claims)
    } catch (err) {
      this.lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  checkCapability(capability: string): void {
    if (!this.subject) {
      this.lastAccessResult = 'denied'
      this.lastDenialCode = 'unauthenticated'
      return
    }
    const granted = this.subject.capabilities.has(capability)
    this.lastAccessResult = granted ? 'granted' : 'denied'
    this.lastDenialCode = granted ? null : 'access_denied'
    this.#writeAudit(capability, granted ? 'granted' : 'denied', granted ? undefined : 'access_denied')
  }

  checkCapabilityForResource(capability: string, resourceId: string): void {
    if (!this.subject) {
      this.lastAccessResult = 'denied'
      this.lastDenialCode = 'unauthenticated'
      return
    }
    const resource = this.resources.get(resourceId)
    if (!resource) throw new Error(`Resource "${resourceId}" not registered in world`)

    const hasCapability = this.subject.capabilities.has(capability)
    if (!hasCapability) {
      this.lastAccessResult = 'denied'
      this.lastDenialCode = 'access_denied'
      this.#writeAudit(capability, 'denied', 'access_denied')
      return
    }

    const subjectOrgUnit = this.subject.orgUnit
    if (
      this.subject.kind === 'human' &&
      subjectOrgUnit !== '*' &&
      subjectOrgUnit !== resource.orgUnit
    ) {
      this.lastAccessResult = 'denied'
      this.lastDenialCode = 'relation_violation'
      this.#writeAudit(capability, 'denied', 'relation_violation')
      return
    }

    this.lastAccessResult = 'granted'
    this.lastDenialCode = null
    this.#writeAudit(capability, 'granted')
  }

  setSubjectEmpty(): void {
    this.subject = { kind: 'human', claims: {}, capabilities: new Set() }
  }

  registerResource(id: string, orgUnit: string): void {
    this.resources.set(id, { orgUnit })
  }

  // cierre mensual state machine
  requestClose(period: string, requestedByToken: string): void {
    this.closeStates.set(period, { requestedBy: requestedByToken })
    this.currentPeriod = period
  }

  approveClose(period: string, approvedByToken: string): void {
    const state = this.closeStates.get(period)
    if (state) state.approvedBy = approvedByToken
  }

  getCloseState(period: string): CloseState | undefined {
    return this.closeStates.get(period)
  }

  checkExecuteClose(period: string): void {
    if (!this.subject) {
      this.lastAccessResult = 'denied'; this.lastDenialCode = 'unauthenticated'; return
    }
    const hasCapability = this.subject.capabilities.has('liquidacion:ejecutar-cierre')
    if (!hasCapability) {
      this.lastAccessResult = 'denied'; this.lastDenialCode = 'access_denied'; return
    }
    const state = this.closeStates.get(period)
    if (!state?.approvedBy) {
      this.lastAccessResult = 'denied'; this.lastDenialCode = 'access_denied'; return
    }
    this.lastAccessResult = 'granted'; this.lastDenialCode = null
    this.#writeAudit('liquidacion:ejecutar-cierre', 'granted')
  }

  getAuditEntries(): readonly AuditEntry[] {
    return this.auditWriter.entries
  }

  #toResolvedSubject(ctx: AccessContext, claims: TokenClaims): ResolvedSubject {
    const { subject, capabilities } = ctx
    if (subject.kind === 'external') {
      return { kind: 'external', claims, capabilities, externalType: claims.achs_external_type }
    }
    if (subject.kind === 'agent') {
      return { kind: 'agent', claims, capabilities, operation: this.#extractOperation(claims) }
    }
    const role = ENTRA_GROUP_TO_ROLE[claims.groups?.[0] ?? '']
    return { kind: 'human', claims, capabilities, orgUnit: subject.orgUnit, role }
  }

  #extractOperation(claims: TokenClaims): string | undefined {
    const azp = claims.azp ?? ''
    const match = azp.match(/pec2-job-([a-z0-9-]+)/)
    return match ? match[1].toUpperCase() : undefined
  }

  #writeAudit(capability: string, outcome: 'granted' | 'denied', denialReason?: string): void {
    void this.auditWriter.write({
      actorKind: this.subject!.kind === 'agent' ? 'agent' : this.subject!.kind === 'external' ? 'external' : 'human',
      actorId: this.subject!.claims.oid ?? this.subject!.claims.sub ?? 'unknown',
      capability,
      outcome,
      happenedAt: new Date().toISOString(),
      denialReason,
    })
  }
}

setWorldConstructor(RbacWorld)
