# RBAC PEC2 — Design Handoff

*Drilled down from `rbac_humano_agente.md`, `handoff_sesion_001.md`, `skeleton-rbac/README.md`, `skeleton-rbac/CONTEXT.md` and ADR-001..ADR-007. Every decision below is reconciled for implementation.*

## Terminology

| Term | Definition | Avoid |
|---|---|---|
| Subject | Authenticated actor attempting a protected action. | user as a generic term |
| HumanSubject | Corporate human authenticated through Entra ID and mapped to one or more business roles (`businessRoles`, capabilities = union). | employee user |
| AgentSubject | Non-human process authenticated with technical identity and registered in `AgentRegistry`. | service user |
| ExternalSubject | External actor such as employer or integration identity outside corporate human IAM. | third-party user |
| Capability | Domain verb that authorizes one action. | CRUD permission |
| CapabilitySet | Effective set of capabilities for one execution. | token roles |
| RelationContext | Resource boundary where capabilities apply. | permissions scope |
| IamAdapter | Infrastructure adapter that validates OIDC/stub identity and returns normalized claims. | RBAC provider |
| AgentRegistry | Versioned registry mapping Entra technical identity to logical agent, operation, environment and max capabilities. | dynamic permission lookup |
| Worker | Runtime process that executes batch/async work using the shared engine. | agent engine |
| Monthly Close | Liquidation close flow: operator requests, supervisor approves, batch job executes. | close-cycle single action |

## Decisions

| # | Decision | Rationale | Scope |
|---|---|---|---|
| 1 | Entra ID is production IAM via OIDC. | ACHS corporate IAM is Entra; OIDC keeps integration standard. `@adonisjs/ally` is not used for Microsoft/Entra. | Human and agent authentication |
| 2 | RBAC consumes normalized `TokenClaims`, not provider-specific objects. | Keeps domain authorization independent from Entra/MSAL/openid-client details. | `IamAdapter`, `AccessContextBuilder` |
| 3 | Unit tests use `StubIamAdapter`; integration tests use mock OIDC. | Fast deterministic tests plus realistic discovery/JWKS validation. | Local dev, CI |
| 4 | Human capabilities come from business role matrices. | Business roles are stable and auditable; capabilities stay versioned in code/docs. | UI/API human requests |
| 5 | Agent capabilities are `token.roles ∩ AgentRegistry.allowedCapabilities`. | Entra proves identity and grants; local registry remains final authority. Unknown agents get no capabilities. | Batch jobs, AFK/HITL agents |
| 6 | Workers live outside RBAC but share the same backend/monorepo and engine. | Avoids premature microservices while preserving separate runtime processes and identities. | `worker-pagos`, `worker-monitoreo`, `worker-outbox`, `worker-reportes` |
| 7 | Monthly close uses double signature. | Prevents unilateral close and gives audit trail: request, approval, execution. | Liquidation close |
| 8 | External employers get only purpose-built capabilities. | Avoids leaking prestation, liquidation or calculation details through generic read permissions. | ExternalSubject |
| 9 | MCP is not a production authorization source. | MCP may help dev agents, but production auth must be Entra/gateway + RBAC. | Agent tooling |
| 10 | Strict claim validation: missing mandatory claims (`orgUnit` for humans, `environment` for agents) fail with `ClaimsValidationError` → 401. No silent defaults. | A default like `?? "dev"` contradicts deny-by-default: malformed tokens would operate with an invented scope. | `AccessContextBuilder` |
| 11 | Multi-group humans get the union of their role matrices; `businessRoles` records all roles. | Collapsing to a "highest privilege" role silently escalates and loses legitimate multi-role users. Anti-self-approval rules check `userId`, not role. | Human capability mapping |
| 12 | `agentType`/`operation` come exclusively from `AgentRegistry`, never inferred from token roles or appId naming. | Name-based inference is fragile and token-role inference is caller-controlled. Unregistered agents authenticate but hold zero capabilities. | Agent subject construction |
| 13 | Manual liquidation adjustments use double signature: Analista creates (`liquidacion:ajustar-manual`, stays `pendiente`), Supervisor approves (`liquidacion:aprobar-ajuste`). | RF-F4-05 requires `approved_by`; same anti-unilateral principle as monthly close. | Liquidation adjustments |
| 14 | Mass IPC readjustment (CALC-MANT-001) uses double signature: `reajuste:solicitar` (Admin Gobernanza), `reajuste:aprobar` (Supervisor), `reajuste:ejecutar` (batch job). | It is the most massive mutation in the system and had no capability at all. | Governance |
| 15 | Monthly close annulment exists with a hard limit: `liquidacion:solicitar-anulacion` (Supervisor), `liquidacion:aprobar-anulacion` (Admin Gobernanza), `liquidacion:ejecutar-anulacion` (job) — only while the bank file is NOT transmitted. See skeleton-pec ADR-011. | A wrongly executed close needs a governed emergency path, not improvisation. | Liquidation close |
| 16 | Auditor sees masked RUT and clear amounts by default; `auditoria:leer-pii` exists but is assigned to no role until Compliance decides. See skeleton-pec ADR-013. | Closes the PII question with a safe operable default instead of blocking TS07. | Auditor role |

## Contracts

### Endpoints

| Method | Path | Request | Response | Errors | Notes |
|---|---|---|---|---|---|
| `GET` | protected routes | `Authorization: Bearer <token>` | Controller receives `HttpContext.accessContext` | `401` missing/invalid token | Middleware contract, route-specific paths live in engine |
| `POST` | protected commands | JSON command + bearer token | Domain result or typed error mapped to HTTP | `403` `AccessDeniedError`, `403` `RelationViolationError` | Controllers must provide `AccessContext` as Effect Layer |
| `POST` | worker entrypoint/CLI internal | technical token/client credentials | job result + audit/outbox | auth failures, deny-by-default | Exact CLI names live in worker package |

### Data model

- **TokenClaims**: `oid?`, `email?`, `groups?`, `extension_orgUnit?`, `appId?`, `azp?`, `roles?`, `environment?`, `operationScope?`, `invokedBy?`, `externalType?`, `sub?`, `jti?`.
- **AccessContext**: `subject`, `capabilities`, `relations`, `requestId`, `issuedAt`.
- **AgentRegistration**: `logicalAgentId`, `entraClientId`, `entraObjectId?`, `agentType`, `operation`, `environment`, `allowedCapabilities`.
- **ExternalCapabilityMap**: `empleador -> hecho-causal:consultar-estado, documento:subir-requerido`.
- **AuditEvent/AppAudit**: `actorKind`, `actorId`, `entraClientId?`, `entraObjectId?`, `agentType?`, `operation?`, `environment`, `capability`, `resourceType`, `resourceId`, `requestId`, `tokenJti?`, `happenedAt`.
- **MonthlyCloseApproval**: `periodo`, `requestedBy`, `requestedAt`, `approvedBy`, `approvedAt`, `preliquidacionHash`, `requestId`, `status`.

### Rules & invariants

- Deny-by-default: empty or unknown capability set grants nothing.
- A valid Entra token is insufficient for an agent unless `AgentRegistry` contains the technical identity.
- Agent effective capabilities are intersection, never union.
- AFK agents cannot mutate production data.
- `liquidacion:solicitar-cierre` belongs to Operador Pagos.
- `liquidacion:aprobar-cierre` belongs to Supervisor.
- `liquidacion:ejecutar-cierre` belongs to `PDN-PAG-001` only with valid approval for the period.
- Operator cannot approve own monthly close request.
- Employers can only consult causal-event status and upload requested documents for their own `empleadorRut`.
- Employers never receive `prestacion:consultar`, `liquidacion:consultar` or `calculo:consultar`.
- RBAC does not execute jobs, publish outbox events, or orchestrate workers.
- Every protected action writes or propagates `requestId`/`correlationId`.
- Every denial (`AccessDeniedError`, `RelationViolationError`) is written to `app_audit` with `outcome=denied` (skeleton-pec ADR-012).
- Manual adjustments stay `pendiente` and do not affect the liquidation until a different user approves them.
- No user can approve their own request in any double-signature flow (close, annulment, adjustment, readjustment) — checked by `userId`.
- Annulment of a monthly close is impossible once the bank file is transmitted.
- Auditor PII masking: masked RUT + clear amounts by default; unmasking requires `auditoria:leer-pii`, unassigned until Compliance resolves.

## Boundaries

| Module | Owns | Depends on | Never touches |
|---|---|---|---|
| `IamAdapter` | Token validation and normalized claims | OIDC issuer/JWKS or stub fixtures | Domain capability decisions |
| `AccessContextBuilder` | Claims to subject, capabilities and relations | Role maps, `AgentRegistry` | Network calls |
| `AuthorizationService` | `require` and `requireRelation` checks | `AccessContext` | Authentication, job execution |
| `AgentRegistry` | Technical identity to logical agent mapping | Versioned config/code | Runtime scheduling |
| Workers | Running batch/async processes | Engine, RBAC, IAM credentials | Defining RBAC policy |
| Engine | Business use-cases and persistence | RBAC Layer, framework resolver, DB | Provider-specific auth logic |
| Gateway | API key perimeter for externals | External credential store | Domain authorization |

## Verification plan

- Unit: unknown human role gets empty capabilities and protected use-case fails.
- Unit: each human role grants exactly the documented matrix.
- Unit: multi-group human gets the exact union of its role matrices, `businessRoles` lists all.
- Unit: human token without `extension_orgUnit` and agent token without `environment` fail with `ClaimsValidationError` → 401 (no default is applied).
- Unit: manual adjustment created by an analista stays `pendiente`; approval by the same `userId` (even holding both roles) is denied.
- Unit: unknown `client_id` with valid-looking roles gets no agent capabilities.
- Unit: agent capability intersection removes roles not allowed by `AgentRegistry`.
- Unit: AFK agent with `environment=prod` cannot obtain mutation capabilities.
- Unit: `requireRelation` denies resources outside `orgUnit`, `assignedCaseIds`, `empleadorRut` or allowed IDs.
- Unit: employer can use `hecho-causal:consultar-estado` only when resource has matching `empleadorRut`.
- Integration: mock OIDC discovery/JWKS token validates through `OidcIamAdapter`.
- Integration: same `OidcIamAdapter` works against mock issuer by config only.
- Workflow: monthly close request by operator, approval by different supervisor, execution by `PDN-PAG-001`.
- Workflow: monthly close execution without approval fails.
- Workflow: close annulment (supervisor requests, admin gobernanza approves, job executes) succeeds only while bank file is untransmitted; fails afterwards.
- Workflow: mass readjustment requires request + approval before the job can execute.
- Audit: protected action records actor, capability, resource and `requestId`.

## Deferred

| Item | Why deferred | Who decides | By when |
|---|---|---|---|
| Assignment of `auditoria:leer-pii` (unmasking) | Safe default already decided (masked RUT + clear amounts, skeleton-pec ADR-013); only the *grant* of unmasking remains a compliance call. Does not block TS07. | Compliance / Legal | Before exposing Auditor UI |
| Exact Entra `orgUnit` claim source | Depends on tenant schema/extensions. | IT / Seguridad ACHS | Before real Entra integration |
| External employer portal phase | Capabilities are defined, but business/legal must confirm whether direct portal access is in scope. | Negocio / Legal | Before implementing `ExternalSubject` endpoints |
| Monthly close phase gate | Rule is defined; whether it starts Fase 2 or Fase 3 remains planning. | Negocio / PO | Before Fase 2 planning |

## Implementation notes

- Implement `IamAdapter` first, then `AccessContextBuilder`, then `AuthorizationService`.
- Keep `AgentRegistry` in versioned code/config for F0-F1; do not put policy in Entra alone.
- Do not use `@adonisjs/ally` for Entra. Use OIDC via `openid-client`; keep `@adonisjs/auth` for app/session concerns if needed.
- Controllers should not decide permissions. They pass `AccessContext` into Effect and use-cases call `AuthorizationService`.
- Workers should run as separate processes from HTTP but import the same engine/RBAC packages.
- Add `ADR-007` capabilities to contract types before implementing monthly close tests.
