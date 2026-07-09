# Discovery — Servicio de Autorización RBAC para PEC2

**Versión:** 0.1
**Fecha:** 2026-07-02
**Autor:** mcontrerasb
**Estado:** Borrador inicial

---

## 1. Contexto y Problema

### 1.1. Situación actual

El motor de cálculo PEC2 (`skeleton-pec`) define un modelo de autorización de tres capas en `rbac_humano_agente.md` y expone contratos en `@achs/pec-contracts/auth` (tipos `Subject`, `Capability`, `AccessContext`, Effect Tag `AuthorizationService` y tagged errors). El engine tiene un stub que permite todo — no hay autorización real.

Para que el engine sea seguro en producción, necesita un servicio de autorización que:

1. **Autentique** a los sujetos (humanos vía Entra ID, agentes vía certificados de servicio, externos vía API key)
2. **Construya** un `AccessContext` por cada request/job
3. **Verifique** capacidades y relaciones (deny-by-default)

### 1.2. Principio guía: construir solo lo que es ventaja competitiva

> "Administrar identidades no es nuestra ventaja competitiva. Calcular prestaciones sí."

Por eso `rbac-contracts` no tiene tabla `users`, no tiene tabla `roles`, no administra grupos. Entra ID ya lo hace y la ACHS no va a ser mejor que Microsoft administrando PKI, rotación de llaves JWKS, MFA y cumplimiento normativo.

Lo mismo con Azure Service Bus para el outbox — no vale la pena construir retry, dead letter y ordering cuando ya existe como servicio gestionado.

El esfuerzo de diseño va donde está el dominio propio: las reglas de cálculo RDN, el marco normativo, la lógica de otorgamiento y liquidación en `pec-engine`. El RBAC y la mensajería son infraestructura que Azure resuelve mejor.

### 1.3. Decisión estratégica: Entra ID

La ACHS usa Microsoft Entra ID (Azure AD) como IAM corporativo. Esto define:

- **Humanos**: autenticados vía OIDC contra Entra ID. El JWT contiene `oid` (user ID), `email`, `groups` (roles de negocio), `extension_orgUnit` (unidad organizacional)
- **Agentes batch**: autenticados vía client credentials (app registration) con roles específicos por job
- **Externos**: autenticados vía API key gestionada por el gateway, mapeada a un `ExternalSubject`

### 1.4. Alcance de este proyecto

El `skeleton-rbac` implementa el **servicio de autorización** como un paquete independiente que:

- Implementa el `AuthorizationService` Tag de `@achs/pec-contracts`
- Provee un middleware de autenticación para AdonisJS (HTTP) y un initializer para jobs batch
- Integra Entra ID mediante un `OidcIamAdapter` basado en `openid-client`, discovery y JWKS
- Provee dos mocks: `StubIamAdapter` para unit tests y mock OIDC local para integración
- Expone un `AccessContextBuilder` que construye el contexto desde claims

### 1.5. Lo que NO hace este proyecto

- No gestiona la asignación de roles a usuarios (eso es Entra ID / administración de ACHS)
- No implementa RLS de base de datos (eso es responsabilidad de las queries en el engine)
- No maneja la UI de login/logout (eso es el frontend Inertia/React y la libreria OIDC/MSAL que defina el frontend)
- No define los contratos de dominio (eso es `@achs/pec-contracts`)

---

## 2. Actores y flujos de autenticación

### 2.1. Actores que se autentican

| Actor | Tipo de Subject | Método de auth | Provider |
|---|---|---|---|
| Analista, Supervisor, Operador Pagos, Admin Gobernanza, Auditor | `HumanSubject` | OIDC Authorization Code + PKCE | Entra ID |
| Jobs batch (PDN-PAG-001, PDN-MON-005/006) | `AgentSubject` (BatchJob) | OAuth2 Client Credentials | Entra ID (app registration) |
| Agente AFK (Claude Code) | `AgentSubject` (AFK) | Client Credentials con scope limitado a dev | Entra ID, mock OIDC o stub |
| Agente HITL | `AgentSubject` (HITL) | Client Credentials + `invokedBy` claim | Entra ID |
| Empleador (externo) | `ExternalSubject` | API Key | Gateway (no Entra ID) |
| Sistema Externo (IPS, SIVEGAM) | `AgentSubject` (ExternalSystem) | Client Credentials o API Key | Entra ID o Gateway |

### 2.2. Flujo HTTP (humano)

```
Browser / SPA
  │  1. Login → Entra ID → JWT (access_token + id_token)
  ▼
AdonisJS Middleware
  │  2. Valida JWT (firma, exp, iss, aud)
  │  3. Extrae claims: oid, email, groups, extension_orgUnit
  ▼
AccessContextBuilder
  │  4. Mapea claims → HumanSubject
  │  5. Mapea groups → CapabilitySet (matriz sección 3.2 del RBAC)
  │  6. Construye RelationContext (orgUnit desde claim)
  ▼
AuthorizationService (Effect Layer)
  │  7. Inyectado como Layer en cada use-case
  │  8. require(cap) y requireRelation(cap, resourceId)
  ▼
Use-case de dominio
```

### 2.3. Flujo job batch (agente)

```
Job scheduler / CLI
  │  1. Client Credentials → Entra ID → access_token
  ▼
Job Initializer
  │  2. Extrae claims: appId, roles, operationScope
  ▼
AccessContextBuilder
  │  3. Mapea appId + roles → AgentSubject (BatchJob)
  │  4. Mapea roles → CapabilitySet (matriz sección 3.4 del RBAC)
  ▼
AuthorizationService
  │  5. Inyectado como Layer
  ▼
Ciclo de procesamiento
```

---

## 3. Mapeo Entra ID → AccessContext

### 3.1. Claims esperados en el JWT

| Claim | Tipo | Ejemplo | Mapeo |
|---|---|---|---|
| `oid` | string (GUID) | `a1b2c3d4-...` | `HumanSubject.userId` |
| `email` | string | `analista@achs.cl` | `HumanSubject.email` |
| `groups` | string[] | `["achs-analistas", "achs-supervisores"]` | `BusinessRole` (vía tabla de mapeo) |
| `extension_orgUnit` | string | `"RM-Norte"` | `HumanSubject.orgUnit` |
| `appId` / `azp` | string (GUID) | `app-reg-pdn-pag-001` | `AgentSubject.agentId` |
| `roles` | string[] | `["liquidacion:calcular", "liquidacion:ejecutar-cierre", "job:ejecutar-ciclo-pago"]` | Grants externos, intersectados con `AgentRegistry` |

### 3.2. Tabla de mapeo: grupo Entra ID → BusinessRole

| Grupo Entra ID | BusinessRole |
|---|---|
| `achs-analistas` | `analista` |
| `achs-supervisores` | `supervisor` |
| `achs-operadores-pago` | `operador_pagos` |
| `achs-admin-gobernanza` | `admin_gobernanza` |
| `achs-auditores` | `auditor` |

### 3.3. Tabla de mapeo: BusinessRole → CapabilitySet

La matriz completa está en `rbac_humano_agente.md` sección 3.2. Esta tabla se materializa como un `Map<BusinessRole, ReadonlySet<Capability>>` inmutable.

### 3.4. AgentRegistry + roles → CapabilitySet

La matriz completa está en `rbac_humano_agente.md` sección 3.4. Para agentes, las capacidades no vienen solo del JWT. El token de Entra ID identifica la App Registration y trae `roles`; el `AgentRegistry` local define que ese `client_id` puede operar como un agente logico especifico, en un ambiente especifico, con capacidades maximas.

```text
effectiveCapabilities = token.roles ∩ AgentRegistry.allowedCapabilities
```

Si no existe entrada en `AgentRegistry`, el agente queda sin capacidades aunque el token sea valido.

---

## 4. Estrategia de Mock para Desarrollo

### 4.1. Principio

El mock **no puede ser un bypass**. Debe simular el flujo completo de Entra ID → claims → AccessContext → AuthorizationService, pero con tokens y claims controlados desde una configuración local. Esto garantiza que:

- El código de producción y el código de desarrollo usan exactamente la misma interfaz (`AuthorizationService` Tag)
- Los tests pueden inyectar cualquier combinación de `Subject` + `CapabilitySet` sin depender de Entra ID
- El deny-by-default se puede probar pasando un `CapabilitySet` vacío

### 4.2. Componentes del mock

```
StubIamAdapter (Effect Layer)
  │  Expone: authenticate(token: string) → TokenClaims
  │  El "token" en unit tests es un string simple: "analista-rm-norte" o "job-pdn-pag-001"
  │  No hay criptografia real — solo mapeo de strings → claims normalizados
  │
AccessContextBuilder (función pura)
  │  Input: TokenClaims
  │  Output: AccessContext con CapabilitySet completo (matriz en memoria)
  │
OidcIamAdapter + mock OIDC local
  │  Usa discovery/JWKS igual que produccion, pero contra issuer local
  │
AuthorizationServiceReal (implementación del Tag)
  │  Input: AccessContext (desde el builder)
  │  require(cap): verifica cap ∈ context.capabilities
  │  requireRelation(cap, resourceId): verifica orgUnit o assignedCaseIds
```

### 4.3. Tokens de desarrollo

Para unit tests, el stub acepta tokens con formato:

```
<rol>-<organizacion>          → HumanSubject
job-<nombre-job>              → AgentSubject (BatchJob)
agent-afk-<ts-id>             → AgentSubject (AFK)
agente-hitl-<operacion>       → AgentSubject (HITL)
```

Ejemplos:
- `analista-rm-norte` → Analista, orgUnit=RM-Norte, todas las caps de analista
- `supervisor-full` → Supervisor, orgUnit=*, todas las caps de supervisor
- `operador-pagos` → Operador Pagos, caps de liquidación
- `auditor` → Auditor, solo lectura
- `job-pdn-pag-001` → BatchJob PDN-PAG-001, caps de ciclo de pago
- `agent-afk-ts06` → Agente AFK, scope=dev, TS06

---

## 5. Arquitectura del paquete

```
skeleton-rbac/
├── README.md
├── package.json                      # @achs/rbac
├── tsconfig.json
├── doc/
│   ├── discovery.md                  # este documento
│   └── adr/
│       ├── ADR-001-iam-entra-id.md
│       ├── ADR-002-mock-strategy.md
│       ├── ADR-003-contracts-consumer.md
│       ├── ADR-004-middleware-pipeline.md
│       └── ADR-005-token-mapping.md
└── src/
    ├── index.ts                      # exporta el Layer compuesto
    ├── iam/
    │   ├── iam-adapter.ts            # IamAdapter interface
    │   ├── oidc-iam-adapter.ts       # implementacion real OIDC
    │   └── stub-iam-adapter.ts       # implementacion stub para unit tests
    ├── builder/
    │   ├── access-context-builder.ts # Subject → AccessContext
    │   ├── role-capability-map.ts   # matrices de mapeo
    │   └── token-parser.ts          # parseo de tokens dev
    ├── service/
    │   └── authorization-service.ts  # implementación del Tag
    ├── middleware/
    │   └── auth-middleware.ts        # AdonisJS middleware
    └── adapters/
        └── oidc-config.ts            # issuer, clientId, audience, jwks
```

---

## 6. Interfaz del IamAdapter

```typescript
// src/iam/iam-adapter.ts
export type IamAdapter = {
  /**
   * Valida un token (JWT de Entra ID/mock OIDC o token stub) y retorna claims normalizados.
   * En producción: valida firma, exp, issuer, audience.
   * En unit tests con stub: parsea el string de rol.
   */
  readonly authenticate: (token: string) => Effect.Effect<TokenClaims, AuthenticationError>

  /**
   * Client credentials flow para agentes batch.
   */
  readonly authenticateClient: (
    clientId: string,
    clientSecret: string,
    scope: string
  ) => Effect.Effect<TokenClaims, AuthenticationError>
}
```

---

## 7. Integración con el Engine

El engine (`skeleton-pec`) consume este paquete como dependencia:

```typescript
// En el engine: app-context.ts
import { RbacLayer } from "@achs/rbac"

// Reemplaza AuthorizationServiceStub con RbacLayer
export const AppLayer = Layer.mergeAll(
  RbacLayer,              // ← reemplaza AuthorizationServiceStub
  FrameworkResolverStub,
  IndicadoresServiceStub,
  OutboxWriterStub
)
```

La migración es swapping de Layers: el engine no cambia su código de dominio, solo cambia la implementación del Tag.

---

## 8. Preguntas abiertas

| # | Pregunta | Quien responde | Impacto |
|---|---|---|---|
| 1 | ¿Entra ID expone `extension_orgUnit` hoy o hay que extender el schema? | IT / Seguridad ACHS | Define si `orgUnit` está disponible en dev o solo en prod |
| 2 | ¿Los grupos de Entra ID (`achs-analistas`, etc.) ya existen o hay que crearlos? | IT / Seguridad ACHS | Define el esfuerzo de setup de Entra ID |
| 3 | ¿Las app registrations para los jobs batch ya están creadas? | IT / Seguridad ACHS | Define si el flow client credentials funciona en dev |
| 4 | ¿El gateway (proxy reverso) ya maneja API keys para sistemas externos? | Arquitectura / IT | Define el scope del adapter de ExternalSubject |
| 5 | ¿Hay un tenant de desarrollo separado (`achsdev`) o se usa el productivo con apps de prueba? | IT / Seguridad ACHS | Define la configuración OIDC de dev |

---

## 9. Definición de Hecho (DoD)

- [ ] `AuthorizationService` implementado como `Context.Tag` con deny-by-default
- [ ] `StubIamAdapter` funcional con todos los roles y capacidades de las matrices
- [ ] Mock OIDC local validado con el mismo `OidcIamAdapter` usado contra Entra ID
- [ ] Middleware de AdonisJS que inyecta `AccessContext` en el HTTP context
- [ ] Tests unitarios para cada rol: verificar que `require` concede/deniega según la matriz
- [ ] Tests de `requireRelation`: verificar filtro por `orgUnit` y `assignedCaseIds`
- [ ] Integración con el engine: `AppLayer` usa `RbacLayer` en lugar del stub
- [ ] `npm run typecheck && npm run test` en verde
