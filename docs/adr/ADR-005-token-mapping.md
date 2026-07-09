# ADR-005 — Mapeo de Claims de Entra ID a AccessContext

**Estado:** Aceptada

## Contexto

Los tokens JWT de Entra ID, los tokens de un mock OIDC local y los fixtures del `StubIamAdapter` producen `TokenClaims` normalizados. Esos claims deben mapearse a los tipos de dominio `Subject`, `BusinessRole`, `Capability` y `RelationContext`. Este mapeo es el corazón del `AccessContextBuilder` y debe ser determinístico, auditable y testeable.

## Decisión

Se define una **cadena de mapeo en 3 pasos**:

```
TokenClaims (OIDC/stub) → Subject → AccessContext
```

### Paso 1: Claims → Subject

Una función pura `claimsToSubject` que discrimina por la presencia de claims. La validación es **estricta**: los claims obligatorios ausentes producen `ClaimsValidationError` (→ HTTP 401), **nunca se rellenan con defaults**. Un default silencioso (`?? "dev"`, `?? "default"`) contradice el deny-by-default: un token malformado terminaría operando con un scope inventado.

| Condición | Subject | Claims obligatorios (si faltan → `ClaimsValidationError`) |
|---|---|---|
| `claims.externalType` presente | `ExternalSubject` | `sub` |
| `claims.oid` y `claims.email` presentes | `HumanSubject` | `oid`, `email`, `extension_orgUnit` |
| `claims.appId` o `claims.azp` presente, sin `email` | `AgentSubject` | `appId`/`azp`, `environment` |

```typescript
type TokenClaims = {
  readonly oid?: string
  readonly email?: string
  readonly groups?: ReadonlyArray<string>
  readonly extension_orgUnit?: string
  readonly appId?: string
  readonly azp?: string
  readonly roles?: ReadonlyArray<string>
  readonly environment?: "dev" | "staging" | "prod"
  readonly operationScope?: string
  readonly invokedBy?: string
  readonly externalType?: "empleador"
  readonly sub?: string
  readonly jti?: string
}

class ClaimsValidationError extends Data.TaggedError("ClaimsValidationError")<{
  missing: ReadonlyArray<string>
  subjectKind: "human" | "agent" | "external"
  message: string
}> {}

const claimsToSubject = (
  claims: TokenClaims
): Effect.Effect<Subject, ClaimsValidationError> =>
  Effect.gen(function* () {
    if (claims.externalType) {
      const sub = yield* required(claims.sub, "sub", "external")
      return {
        kind: "external",
        externalId: sub,
        externalType: claims.externalType,
        authenticatedVia: "api_key"
      } satisfies ExternalSubject
    }
    if (claims.oid && claims.email) {
      const orgUnit = yield* required(claims.extension_orgUnit, "extension_orgUnit", "human")
      return {
        kind: "human",
        userId: claims.oid,
        email: claims.email,
        businessRoles: mapGroupsToRoles(claims.groups ?? []), // puede ser [] → caps vacías → deny
        orgUnit,
        authenticatedVia: "sso"
      } satisfies HumanSubject
    }
    const agentId = yield* required(claims.appId ?? claims.azp, "appId|azp", "agent")
    const environment = yield* required(claims.environment, "environment", "agent")
    // agentType y operation NO se infieren de los claims: los fija el AgentRegistry (paso 2).
    // Si no hay entrada en el registry, el subject queda como 'unregistered' con caps vacías.
    const registration = findAgentRegistration(agentId)
    return {
      kind: "agent",
      agentId,
      agentType: registration?.agentType ?? "ExternalSystem", // residual auditable; sin caps
      operationScope: {
        operation: registration?.operation ?? "unregistered",
        environment
      },
      invokedBy: claims.invokedBy,
      environment
    } satisfies AgentSubject
  })
```

### Paso 2: Subject → CapabilitySet

Una tabla de lookup inmutable para humanos y una registry local para agentes:

```typescript
const humanCapabilityMap: Record<BusinessRole, ReadonlySet<Capability>> = {
  analista: new Set(["prestacion:otorgar", "prestacion:denegar", "prestacion:consultar", /* ... */]),
  supervisor: new Set(["prestacion:otorgar", "prestacion:cesar", /* ... */]),
  // ...
}

const externalCapabilityMap: Record<ExternalSubject["externalType"], ReadonlySet<Capability>> = {
  empleador: new Set(["hecho-causal:consultar-estado", "documento:subir-requerido"])
}

type AgentRegistration = {
  readonly logicalAgentId: string
  readonly entraClientId: string
  readonly entraObjectId?: string
  readonly agentType: AgentType
  readonly operation: string
  readonly environment: "dev" | "staging" | "prod"
  readonly allowedCapabilities: ReadonlySet<Capability>
}

const agentRegistry: ReadonlyArray<AgentRegistration> = [
  {
    logicalAgentId: "pec2-job-pdn-pag-001",
    entraClientId: "1111-2222-3333",
    agentType: "BatchJob",
    operation: "PDN-PAG-001",
    environment: "prod",
    allowedCapabilities: new Set(["job:ejecutar-ciclo-pago", "liquidacion:calcular", /* ... */])
  }
]

const getAgentCapabilities = (
  subject: AgentSubject,
  claims: TokenClaims
): ReadonlySet<Capability> => {
  const registered = findAgentRegistration(subject, claims)
  if (!registered) return new Set()
  return intersectCapabilities(claims.roles ?? [], registered.allowedCapabilities)
}

const getCapabilities = (
  subject: Subject,
  claims: TokenClaims
): ReadonlySet<Capability> => {
  switch (subject.kind) {
    case "human":
      // UNIÓN de las matrices de todos los roles del usuario.
      // Cero roles reconocidos → Set vacío → deny-by-default (403, auditable).
      return subject.businessRoles.reduce(
        (acc, role) => union(acc, humanCapabilityMap[role] ?? new Set()),
        new Set<Capability>()
      )
    case "agent": return getAgentCapabilities(subject, claims)
    case "external": return externalCapabilityMap[subject.externalType] ?? new Set()
  }
}

const buildAccessContext = (
  claims: TokenClaims
): Effect.Effect<AccessContext, ClaimsValidationError> =>
  Effect.gen(function* () {
    const subject = yield* claimsToSubject(claims)
    return {
      subject,
      capabilities: getCapabilities(subject, claims),
      relations: buildRelationContext(subject),
      requestId: claims.jti ?? crypto.randomUUID(),
      issuedAt: new Date()
    }
  })
```

Para agentes, Entra ID prueba identidad y entrega grants. El `AgentRegistry` versionado sigue siendo la autoridad local de que ese `client_id` puede operar como `PDN-PAG-001` en `prod`. La capacidad efectiva es la interseccion, nunca la union.

Para externos, las capacidades son minimas y siempre requieren `RelationContext.empleadorRut`. Un empleador no puede usar capacidades generales de prestación, liquidación o cálculo.

### Paso 3: Subject → RelationContext

```typescript
const buildRelationContext = (subject: Subject): RelationContext => ({
  orgUnit: subject.kind === "human" ? subject.orgUnit : undefined,
  operationId: subject.kind === "agent" ? subject.agentId : undefined,
  delegatedBy: subject.kind === "agent" ? subject.invokedBy : undefined,
  empleadorRut: subject.kind === "external" ? subject.externalId : undefined
})
```

### 5.3. Mapeo de grupos Entra ID → BusinessRole

| Claim `groups` (Entra ID) | `BusinessRole` |
|---|---|
| `achs-analistas` | `analista` |
| `achs-supervisores` | `supervisor` |
| `achs-operadores-pago` | `operador_pagos` |
| `achs-admin-gobernanza` | `admin_gobernanza` |
| `achs-auditores` | `auditor` |

**Multi-grupo:** si el usuario pertenece a varios grupos, `businessRoles` los registra todos y el `CapabilitySet` es la **unión** de sus matrices. No se colapsa a un "rol de mayor privilegio" (escala privilegios silenciosamente) ni se rechaza el token (los usuarios multi-rol son legítimos, ej. operador que además administra gobernanza). Los grupos no reconocidos se ignoran; cero grupos reconocidos produce un `CapabilitySet` vacío — el request autentica (401 no) pero toda acción protegida deniega (403), y la denegación queda en `AppAudit`. Las reglas anti-auto-aprobación (cierre, ajuste manual, anulación, reajuste) se verifican por `userId`, no por rol — necesario justamente por la unión multi-rol.

### 5.4. AgentType: lo fija el `AgentRegistry`, nunca se infiere

El `agentType` y la `operation` de un `AgentSubject` provienen **exclusivamente de la entrada del `AgentRegistry`** para ese `client_id`. No hay inferencia por prefijo de nombre ni por roles del token: ambas son frágiles (dependen de convenciones de nombres de App Registrations) y manipulables (los roles vienen del token). Un agente sin entrada en el registry queda con `agentType` residual, `operation = "unregistered"` y `CapabilitySet` vacío — autentica, pero toda acción deniega y el intento queda auditado.

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| Mapeo en BD (tabla `user_roles`) | Agrega latencia y dependencia de BD en el middleware. Para F0, el mapeo en memoria es suficiente. |
| Claims directos como capacidades para humanos (`roles: ["prestacion:otorgar"]`) | Mezcla administración de IAM con dominio de negocio. Los grupos de Entra ID son estables; las capacidades pueden evolucionar. Para agentes batch, los app roles si pueden mapearse 1:1 a capacidades operacionales acotadas. |
| Microservicio de autorización externo (OPA, Cerbos) | Overkill para F0-F1. Se puede migrar después si hay políticas complejas. |

## Consecuencias

- **Positivas:** el mapeo es puro, testeable y auditable. Cada paso es una función sin efectos.
- **Positivas:** cambiar una capacidad en la matriz es una línea de código, no una operación de infraestructura.
- **Positivas:** sin defaults silenciosos: un token con claims incompletos falla en autenticación (`ClaimsValidationError` → 401), y un agente no registrado autentica pero no puede hacer nada — ambos casos visibles y auditables.
- **Negativas:** el `CapabilitySet` está hardcodeado. Si hay que agregar/quitar capacidades en caliente (sin deploy), se necesitaría migrar a BD. Cambiar la matriz es un cambio de código con code review — aceptado como feature para F0–F1 (la matriz queda versionada y auditable en git).

## Referencias

- ADR-001: Entra ID como IAM
- `rbac_humano_agente.md` secciones 2, 3, 4
- `@achs/pec-contracts/auth` — tipos completos
- [Microsoft Entra ID claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference)
- ADR-002: Stub y mock OIDC local
