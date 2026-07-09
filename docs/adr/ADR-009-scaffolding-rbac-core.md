# ADR-009 — Scaffolding completo del motor RBAC

**Estado:** Reemplazada por ADR-010 (nunca salió de borrador)

> El scaffolding descrito aquí (monorepo con `@achs/rbac-contracts` publicado + `rbac-engine` deployable + SPA separada) fue reemplazado por el monolito modular AdonisJS + Inertia con el módulo en `app/modules/rbac/` (ver ADR-010). Se conserva como registro histórico.

## Contexto

Los ADRs 001–008 definen las decisiones técnicas del motor RBAC pero ninguno codifica la **estructura concreta de directorios y paquetes**. Sin esa convención un agente no sabe dónde crear un nuevo adapter, cómo conectar el `IamAdapter` al pipeline, ni por qué `rbac-contracts` es un paquete publicado y `rbac-engine` no.

La distinción clave que justifica la estructura:

| Paquete | Publicado como npm | Consumidores |
|---|---|---|
| `@achs/rbac-contracts` | Sí | `pec-engine`, la SPA de presentación, otros motores futuros |
| `@achs/rbac-engine` | No — es el deployable | Solo el runtime propio |

`skeleton-rbac` publica `rbac-contracts` porque tiene una **capa de presentación separada** (SPA). Esa SPA necesita los tipos (`Subject`, `Capability`, `BusinessRole`) sin importar el engine completo. `pec-engine` también los necesita para integrar autorización. Ambos consumen el mismo paquete liviano.

---

## Decisión

### 1. Árbol completo del monorepo

```
skeleton-rbac/
├── package.json                           # workspace root (npm workspaces)
├── tsconfig.base.json
├── docker-compose.yml                     # rbac-engine + postgres + mock-oidc
│
├── packages/
│   │
│   ├── rbac-contracts/                    # @achs/rbac-contracts — PUBLICADO como npm
│   │   ├── package.json                   # deps: effect ^3.x SOLO
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                   # barrel
│   │       ├── subject.ts                 # Subject, HumanSubject, AgentSubject, ExternalSubject
│   │       │                              # BusinessRole, AgentType, OperationScope
│   │       ├── capability.ts              # Capability (todos los verbos de dominio)
│   │       ├── access-context.ts          # AccessContext, RelationContext
│   │       └── authorization.ts           # AuthorizationService Tag
│   │                                      # AccessDeniedError, RelationViolationError
│   │                                      # ClaimsValidationError
│   │
│   └── rbac-engine/                       # @achs/rbac-engine — deployable, NO publicado
│       ├── package.json                   # deps: @achs/rbac-contracts, effect,
│       │                                  #        openid-client, @adonisjs/*
│       ├── tsconfig.json
│       ├── Dockerfile                     # multistage: contracts-builder → engine-builder → runtime
│       │
│       ├── src/domain/                    # capa de aplicación — todo Effect
│       │   ├── app-context.ts             # AppLayer del motor RBAC
│       │   ├── run-effect.ts              # frontera única Adonis ↔ Effect
│       │   │
│       │   ├── iam/
│       │   │   ├── iam-adapter.ts         # IamAdapter Tag + AuthenticationError (internos)
│       │   │   ├── token-claims.ts        # TokenClaims (interno — no va en rbac-contracts)
│       │   │   ├── oidc-iam-adapter.ts    # impl real con openid-client
│       │   │   └── stub-iam-adapter.ts    # StubIamAdapter + TokenClaimsFixture
│       │   │
│       │   ├── access-context/
│       │   │   ├── access-context-builder.ts    # TokenClaims → Effect<AccessContext, ClaimsValidationError>
│       │   │   ├── claims-to-subject.ts          # función pura — sin efectos
│       │   │   ├── capability-map.ts             # humanCapabilityMap, externalCapabilityMap
│       │   │   └── relation-context-builder.ts   # función pura — sin efectos
│       │   │
│       │   ├── authorization/
│       │   │   ├── authorization-service-stub.ts # allow-all — solo para tests
│       │   │   └── authorization-service.ts      # AuthorizationServiceReal: impl del Tag
│       │   │
│       │   ├── registry/
│       │   │   ├── agent-registry.ts             # AgentRegistration[] — config versionada en código
│       │   │   └── agent-registry-lookup.ts      # funciones puras de búsqueda
│       │   │
│       │   └── audit/
│       │       ├── app-audit-writer-stub.ts      # Ref en memoria
│       │       └── app-audit-writer-service.ts   # impl Lucid insert-only
│       │
│       ├── app/                           # capa de infraestructura — AdonisJS
│       │   ├── middleware/
│       │   │   └── auth-middleware.ts     # Bearer + Sesión → AccessContext en HttpContext
│       │   └── controllers/
│       │       └── health-controller.ts
│       │
│       ├── database/
│       │   └── migrations/
│       │       ├── 001_app_audit.ts
│       │       └── 002_monthly_close_approvals.ts
│       │
│       └── test/
│           ├── unit/
│           └── integration/
│
└── doc/
    └── adr/
```

---

### 2. Por qué `rbac-contracts` solo depende de `effect`

`rbac-contracts` define tipos de dominio de autorización: quién puede hacer qué. No sabe de OIDC, JWT, Lucid ni AdonisJS. Eso garantiza que la SPA y `pec-engine` puedan importarlo sin arrastrar dependencias de infraestructura.

```typescript
// rbac-contracts/src/capability.ts — dominio puro
export type Capability =
  | "prestacion:otorgar"
  | "calculo:ejecutar"
  | "liquidacion:cerrar-ciclo"
  | "agente:ejecutar-ts"
  // ... todos los verbos de dominio

// rbac-contracts/src/authorization.ts — Tag + errores
export const AuthorizationService =
  Context.GenericTag<AuthorizationService>("AuthorizationService")

export class AccessDeniedError extends Data.TaggedError("AccessDeniedError")<{
  readonly capability: Capability
  readonly subjectKind: string
  readonly message: string
}> {}
```

`TokenClaims`, `IamAdapter`, `AgentRegistration` y todo lo relacionado con OIDC/JWT son tipos **internos** de `rbac-engine` — no se publican en `rbac-contracts`.

---

### 3. AppLayer del motor RBAC

```typescript
// rbac-engine/src/domain/app-context.ts
import { AuthorizationService } from "@achs/rbac-contracts"   // Tag del contrato público

export const AppLayer = Layer.mergeAll(
  // IamAdapter: valida tokens JWT contra Entra ID
  OidcIamAdapterLayer,          // stub en dev: StubIamAdapterLayer

  // AuthorizationService: verifica capacidades del AccessContext
  AuthorizationServiceReal,     // stub en tests: AuthorizationServiceStub

  // AppAuditWriter: persiste eventos de auth en app_audit
  AppAuditWriterService,        // stub en tests: AppAuditWriterStub
)
```

---

### 4. Reglas del límite

| Módulo | Puede importar | Nunca importa |
|---|---|---|
| `rbac-contracts/src/` | `effect ^3.x` | `@adonisjs/*`, Lucid, `openid-client`, `pec-*` |
| `rbac-engine/src/domain/iam/` | `effect`, `openid-client`, tipos locales | `@achs/rbac-contracts`, Lucid, Adonis |
| `rbac-engine/src/domain/access-context/` | `@achs/rbac-contracts`, tipos de `iam/`, `registry/` | Adonis, Lucid, HTTP |
| `rbac-engine/src/domain/authorization/` | `@achs/rbac-contracts`, `access-context/` | `iam/`, Adonis |
| `rbac-engine/src/domain/registry/` | `@achs/rbac-contracts` (solo tipos) | Todo lo demás |
| `rbac-engine/src/domain/audit/` | `@achs/rbac-contracts`, Lucid | `iam/`, `access-context/` |
| `rbac-engine/app/middleware/` | `iam/`, `access-context/`, Adonis HTTP | use-cases de dominio |

---

### 5. Cómo consume `pec-engine` este motor

`pec-engine` importa `@achs/rbac-contracts` para obtener el `AuthorizationService` Tag y usarlo en sus use-cases. Nunca importa de `@achs/rbac-engine` — los internos de implementación son opacos.

```typescript
// pec-engine/src/domain/use-cases/otorgar-pension.ts
import { AuthorizationService } from "@achs/rbac-contracts"   // ← del motor RBAC
import { FrameworkResolverService } from "@achs/pec-contracts/marco-normativo"

const otorgarPension = (cmd: OtorgarPrestacionCmd) =>
  Effect.gen(function* () {
    const auth = yield* AuthorizationService
    yield* auth.require("prestacion:otorgar")
    // ...
  })
```

En producción, `pec-engine/src/domain/app-context.ts` monta el Layer que provee la implementación real:

```typescript
// Antes F0 (stub local en pec)
import { AuthorizationServiceStub } from "./auth/authorization-service-stub.js"

// Producción (Layer de rbac-engine)
import { AuthorizationServiceReal } from "@achs/rbac-engine"
```

---

### 6. Ciclo de vida de implementaciones

| Fase | IamAdapter | AuthorizationService | Activado por |
|---|---|---|---|
| F0 skeleton | — | stub allow-all en pec-engine | AppLayer de pec |
| TS07 | `StubIamAdapterLayer` | stub en pec-engine | `IAM_MODE=stub` |
| TS08 | `OidcIamAdapterLayer` contra mock OIDC local | stub en pec-engine | `IAM_MODE=oidc-local` |
| TS09 | `OidcIamAdapterLayer` | `AuthorizationServiceReal` de rbac-engine | AppLayer de pec con rbac real |
| Producción | `OidcIamAdapterLayer` contra Entra ID | `AuthorizationServiceReal` | `NODE_ENV=production` |

---

### 7. Mock OIDC en docker-compose propio

El mock OIDC vive en el `docker-compose.yml` de `skeleton-rbac`. Los desarrolladores que trabajan solo en `skeleton-pec` no lo levantan:

```yaml
# skeleton-rbac/docker-compose.yml
services:
  rbac-engine:
    build: .
    ports: ["3001:3001"]
    depends_on: [postgres, mock-oidc]

  postgres:
    image: postgres:16-alpine

  mock-oidc:
    image: ghcr.io/navikt/mock-oauth2-server:2
    ports: ["8080:8080"]
    volumes:
      - ./docker/mock-oidc/oidc-config.json:/config/oidc-config.json
```

### 8. Modelo de App Registrations en Entra ID

Una App Registration representa una **identidad de servicio**, no una instancia de ejecución. Un millón de ejecuciones concurrentes del mismo job usan el mismo `clientId` — Entra ID no sabe cuántos workers corren. Lo que diferencia ejecuciones individuales es el `requestId`/`correlationId` en `app_audit`, no el `clientId`.

#### 8.1. Registros de producción (estáticos en `AgentRegistry`)

| App Registration | `agentType` | `operation` | Entrada en `AgentRegistry` |
|---|---|---|---|
| `pec2-job-pdn-pag-001` | `BatchJob` | `PDN-PAG-001` | Sí |
| `pec2-job-pdn-mon-005` | `BatchJob` | `PDN-MON-005` | Sí |
| `pec2-external-empleador` | `ExternalSystem` | `empleador-api` | Sí |

Cada job de producción tiene su propia App Registration porque sus capacidades son distintas y el cambio requiere code review + deploy. Son pocos registros — uno por tipo de job, no uno por instancia.

#### 8.2. Registros de desarrollo (dinámicos en `dev_agent_sessions`)

Para los agentes AFK del backlog (TS01–TS19) **basta con una sola App Registration en Entra ID**:

| App Registration | `agentType` | Uso |
|---|---|---|
| `pec2-agent-afk-dev` | `AFK` | Todos los agentes AFK que ejecutan TSs en dev |

La granularidad por TS se controla en la tabla `dev_agent_sessions`, no en Entra ID:

```
Admin Gobernanza crea sesión antes de lanzar el AFK:
┌──────────────────────────────────────────────────────┐
│ agent_id:     "pec2-agent-afk-dev"  (el clientId)   │
│ agent_type:   "AFK"                                  │
│ operation:    "TS07"          ← scope exacto del TS  │
│ capabilities: ["calculo:ejecutar", "prestacion:..."] │
│ expires_at:   now + 8h                               │
└──────────────────────────────────────────────────────┘
```

El AFK solicita un token con ese scope, ejecuta el TS, la sesión expira. Para TS08 se crea un nuevo registro con `operation: "TS08"` y las capacidades correspondientes. El `app_audit` registra exactamente qué TS causó cada acción.

Si en el futuro se necesita separar capacidades entre AFK de infraestructura y AFK de dominio, se crean dos registros:

| App Registration | Scope | Capacidades |
|---|---|---|
| `pec2-agent-afk-infra` | TS01–TS03, TS18–TS19 | bootstrap, migrations, observabilidad |
| `pec2-agent-afk-domain` | TS06–TS17 | calculo, prestacion, liquidacion, marco |

Por ahora un solo registro es suficiente para el backlog completo.

#### 8.3. Scaffolding de un nuevo agente técnico de producción

Agregar el job `PDN-MON-005`:

1. Entrada en `registry/agent-registry.ts` con `entraClientId`, `agentType`, `operation`, `environment`, `allowedCapabilities`.
2. App Registration en Entra ID con ese `CLIENT_ID`.
3. Variable de entorno `CLIENT_ID` en la configuración del worker.

No requiere tocar `rbac-contracts`, el middleware ni el motor de cálculo.

---

## Alternativas descartadas

| Alternativa | Razón |
|---|---|
| RBAC como workspace dentro de skeleton-pec | Ciclos de release independientes. Mezclarlos acopla versiones y complica deploys individuales. |
| RBAC como microservicio HTTP (sidecar) | ADR-006 lo descartó: latencia por cada verificación de capacidad + contratos de red propios. |
| `TokenClaims` e `IamAdapter` en rbac-contracts | Expondría infraestructura OIDC a la SPA y a pec-engine sin utilidad. Son internos del engine. |
| `AppAuditWriterService` Tag en pec-contracts | Auth es dominio de rbac. El Tag de auditoría de auth vive en rbac-contracts; pec-engine lo consume igual que consume `AuthorizationService`. |

---

## Gaps modelados: registro dinámico, granularidad de operación y delegación HITL

### Gap 1 — AgentRegistry híbrido: estático para prod, tabla para dev/AFK

El `AgentRegistry` actual es código versionado en `registry/agent-registry.ts`. Eso es correcto para agentes de producción (`BatchJob`, `ExternalSystem`) que cambian con poca frecuencia y merecen code review + deploy. Pero bloquea el flujo agentic: cada nuevo TS que ejecuta un AFK requeriría un deploy de rbac-engine antes de que el agente pueda autenticarse.

**Decisión:** registro híbrido en dos capas, consultadas en orden:

```
1. registry/agent-registry.ts   ← estático, solo agentes prod y workers conocidos
2. tabla dev_agent_sessions     ← dinámica, solo environment = "dev", con TTL
```

```typescript
// registry/agent-registry-lookup.ts
export const findAgentRegistration = (
  agentId: string,
  environment: string
): AgentRegistration | undefined => {
  // primero el registro estático — gana en caso de conflicto
  const staticEntry = staticRegistry.find(r => r.entraClientId === agentId)
  if (staticEntry) return staticEntry

  // solo en dev: busca en tabla dinámica
  if (environment === "dev") return devSessionRegistry.find(agentId)

  return undefined   // sin entrada → cero capacidades
}
```

**Tabla `dev_agent_sessions`** (solo en `rbac-engine`):

```sql
create table dev_agent_sessions (
  id          uuid primary key default gen_random_uuid(),
  agent_id    text not null,           -- entraClientId o identificador de sesión
  agent_type  text not null check (agent_type in ('AFK', 'HITL')),
  operation   text not null,           -- TS-001-04 o * para sesión de dev abierta
  invoked_by  text,                    -- userId del humano que lo inició (HITL)
  capabilities jsonb not null,         -- subset de las capacidades permitidas en dev
  expires_at  timestamptz not null,    -- TTL obligatorio — nunca permanente
  created_by  text not null,           -- userId del Admin Gobernanza que lo registró
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

create index dev_agent_sessions_agent_id_idx on dev_agent_sessions (agent_id)
  where revoked_at is null and expires_at > now();
```

**Reglas:**
- Solo se puede crear con `environment = "dev"` en el token del creador.
- `capabilities` es subconjunto de las capacidades dev definidas en `rbac_humano_agente.md` sección 3.4 — no puede excederlas.
- `expires_at` máximo 8 horas. Un Admin Gobernanza puede revocar antes.
- En producción esta tabla no existe o está vacía y el lookup la omite.

**Consecuencia:** un agente AFK puede empezar a ejecutar un TS nuevo sin deploy de rbac, siempre que un Admin Gobernanza haya creado la sesión dev. El deploy de rbac sigue siendo el camino para agentes de producción.

---

### Gap 2 — Granularidad de `operationScope`: token por TS

Un agente AFK que ejecuta múltiples TSs en una sesión de desarrollo debe presentar **un token por TS**, no un token de sesión abierta. La razón: el `app_audit` necesita saber exactamente qué operación estaba ejecutando el agente cuando realizó cada acción.

```
Token TS-001-04:
  agentType: "AFK"
  operation: "TS-001-04"       ← qué TS
  environment: "dev"
  capabilities: [calculo:ejecutar, prestacion:consultar, ...]

Token TS-001-05 (diferente token):
  operation: "TS-001-05"
```

**Por qué no un token de sesión abierta con `operation: "*"`:**
- En `app_audit` quedaría `operation: "*"` — inauditable. No se puede reconstruir qué TS causó qué acción.
- Si el agente tiene permisos amplios y comete un error en TS-001-05, no se puede saber si el daño vino de ese TS o del anterior.

**Cómo funciona en la práctica:**

El `dev_agent_sessions` tiene `operation: "TS-001-04"`. El agente solicita su token con ese scope. Al terminar el TS, expira o se revoca la sesión. Para el siguiente TS, un nuevo registro y un nuevo token.

```typescript
// rbac-contracts — operationScope en el subject
export type OperationScope = {
  readonly operation: string        // "TS-001-04" — nunca "*" en audit
  readonly environment: "dev" | "staging" | "prod"
}
```

**Entrada en `app_audit` con granularidad completa:**

```json
{
  "actorKind": "agent",
  "actorId": "claude-code-afk-session-xyz",
  "agentType": "AFK",
  "operation": "TS-001-04",
  "environment": "dev",
  "capability": "calculo:ejecutar",
  "resourceType": "PrestacionEconomica",
  "resourceId": "pec-123",
  "outcome": "granted",
  "requestId": "corr-456",
  "happenedAt": "2026-07-03T10:00:00Z"
}
```

Con esto se puede reconstruir: "el AFK ejecutando TS-001-04 calculó el sueldo base de pec-123 el 2026-07-03 a las 10:00".

---

### Gap 3 — Delegación HITL: registro explícito de qué puede ver el agente

Cuando un humano invoca un agente HITL para que genere un borrador o diagnóstico, no basta con `invokedBy: userId`. El HITL necesita saber **sobre qué recursos** puede operar, y eso debe quedar auditado.

**Tabla `hitl_delegations`** en `rbac-engine`:

```sql
create table hitl_delegations (
  id              uuid primary key default gen_random_uuid(),
  delegated_by    text not null,          -- userId del humano que invoca
  agent_session_id text not null,         -- referencia a dev_agent_sessions.id
  allowed_capabilities jsonb not null,    -- subset de capacidades de lectura
  allowed_resources    jsonb not null,    -- [{ resourceType, resourceId }]
  purpose         text not null,          -- descripción del encargo ("generar diagnóstico inc-123")
  expires_at      timestamptz not null,   -- TTL — típicamente duración de la sesión HITL
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz,

  constraint hitl_delegation_read_only
    check (allowed_capabilities::text not like '%:ejecutar%'
       and allowed_capabilities::text not like '%:cerrar%'
       and allowed_capabilities::text not like '%:aprobar%')
);
```

**Reglas:**
- `allowed_capabilities` solo puede contener capacidades de lectura (`*:consultar`, `incidente:consultar`, `auditoria:leer-*`). La constraint impide delegar escritura o aprobación.
- Un HITL no puede tener capacidades que el humano delegante no tiene (el servicio verifica `delegatedBy.capabilities ⊇ allowed_capabilities`).
- El HITL solo puede acceder a los `resourceId` listados en `allowed_resources` — `requireRelation` verifica contra esta tabla.

**Flujo en pec-engine:**

```
1. Analista (A1) invoca agente HITL desde UI
   → POST /hitl/delegate
     { agentSessionId, capabilities: ["incidente:consultar"], resources: [{ type: "IncidenteDeDominio", id: "inc-123" }], purpose: "...", expiresAt: +2h }
   → crea hitl_delegations row

2. HITL agent presenta token con invokedBy: "A1", agentSessionId: "hitl-xyz"

3. HITL intenta leer incidente inc-123
   → AuthorizationService.requireRelation("incidente:consultar", "inc-123")
   → verifica hitl_delegations: ¿existe delegación activa de "A1" para este agente sobre "inc-123"?
   → granted
   → app_audit: { actorKind: "agent", agentType: "HITL", invokedBy: "A1",
                  capability: "incidente:consultar", resourceType: "IncidenteDeDominio",
                  resourceId: "inc-123", outcome: "granted" }

4. HITL intenta aprobar el plan del incidente
   → AuthorizationService.require("incidente:aprobar-plan")
   → denied (capacidad no está en allowed_capabilities de la delegación)
   → app_audit: { ..., capability: "incidente:aprobar-plan", outcome: "denied",
                  denialReason: "capability not delegated" }

5. Humano A1 revisa el borrador del HITL y aprueba manualmente
   → A1 usa su propia sesión HTTP con su token humano
   → app_audit: { actorKind: "human", actorId: "A1", capability: "incidente:aprobar-plan", ... }
```

**Invariante crítica:** ninguna acción que requiera doble firma (cierre mensual, ajuste manual, anulación, reajuste IPC) puede ser aprobada por un HITL. La constraint de la tabla + la verificación de capacidades en `AuthorizationService` lo garantizan en dos capas independientes.

---

### 9. Convención de semver para `@achs/rbac-contracts`

`rbac-contracts` vive en un repo separado de sus consumidores (`skeleton-pec`, `skeleton-rbac-front`). Un cambio en el contrato puede romper compilación en múltiples repos. La siguiente tabla define qué tipo de cambio corresponde a qué bump de versión:

| Cambio | Semver | Impacto en consumidores |
|---|---|---|
| Agregar un valor nuevo a `Capability` | `patch` | Ninguno — los consumidores ignoran los valores que no usan |
| Agregar campo **opcional** a `AccessContext`, `Subject` o `RelationContext` | `minor` | Ninguno — TypeScript acepta campos extra |
| Agregar campo **requerido** a cualquier tipo | **`major`** | Rompe compilación en todos los consumidores |
| Renombrar o eliminar un valor de `Capability` | **`major`** | Rompe compilación donde ese valor se referencia |
| Renombrar o eliminar un campo existente | **`major`** | Ídem |
| Cambiar el tipo de un campo existente | **`major`** | Ídem |
| Agregar un método a `AuthorizationService` | **`major`** | Rompe todas las implementaciones (stubs en pec-engine incluidos) |

**Reglas operativas:**

- Agregar es seguro. Renombrar o eliminar obliga a coordinar los tres repos antes de publicar.
- Los consumidores deben pinear con `^` (acepta minor y patch) — no con `*` ni con versión exacta.
- Antes de publicar un `major`, se abre un issue en cada repo consumidor con el diff de migración necesario.
- La rama `main` de `rbac-contracts` solo recibe commits que pasan los tipos de `pec-engine` y `rbac-front` (CI cross-repo o checklist manual hasta que haya CI automatizado).

---

## Consecuencias

- **Positivas:** la SPA y pec-engine importan un paquete liviano (`rbac-contracts`) sin arrastrar openid-client, Lucid ni AdonisJS.
- **Positivas:** reemplazar el stub de auth en pec-engine es una línea en su `AppLayer` — sin tocar use-cases.
- **Positivas:** `registry/agent-registry.ts` es la única fuente de verdad para agentes técnicos.
- **Negativas:** pec-engine y la SPA tienen dependencia de release en `@achs/rbac-contracts`. Viven en repos separados, por lo que un breaking change en el contrato obliga a coordinar actualización, ajuste de código y deploy en cada consumidor. Se mitiga con semver estricto y la convención de cambios documentada en la sección 9.
- **Negativas:** `app/middleware/auth-middleware.ts` conoce AdonisJS dentro de un paquete que por lo demás es framework-agnostic. Es deliberado — el middleware es el adaptador de entrada.
- **Negativas (Gap 1):** el flujo agentic requiere que un Admin Gobernanza cree la sesión dev antes de que el AFK empiece. Es una fricción deliberada — sin ese gate, cualquier proceso podría registrarse como agente.
- **Negativas (Gap 2):** un token por TS significa que el AFK necesita renovar credenciales entre TSs. El mecanismo de solicitud de token debe estar automatizado en el tooling del agente.
- **Negativas (Gap 3):** la tabla `hitl_delegations` agrega una consulta extra en cada `requireRelation` de un HITL. Se mitiga con índice por `agent_session_id` y caché del `AccessContext` por request.

---

## Referencias

- ADR-001: Entra ID como IAM, `IamAdapter`
- ADR-002: Estrategia de mock (`StubIamAdapter`, mock OIDC local)
- ADR-003: `skeleton-rbac` consume `@achs/rbac-contracts` sin duplicar tipos
- ADR-004: Middleware pipeline, Bearer + Sesión
- ADR-005: Mapeo de claims a `AccessContext`, `AgentRegistry`, capability maps
- ADR-006: Workers fuera de RBAC, mismo repo
- ADR-007: Doble firma cierre mensual
- ADR-008: Modelo de datos (`app_audit`, `monthly_close_approvals`)
- `rbac_humano_agente.md` v0.3 — matrices completas de capacidades
- `skeleton-pec/doc/adr/ADR-015` — scaffolding del motor de cálculo (consume `@achs/rbac-contracts`)
- `rbac_humano_agente.md` sección 3.4 — capacidades máximas de AFK/HITL en dev (techo de `dev_agent_sessions`)
- `skeleton-rbac/doc/adr/ADR-008` — modelo de datos (`app_audit`, `monthly_close_approvals`): se agregan `dev_agent_sessions` y `hitl_delegations`
