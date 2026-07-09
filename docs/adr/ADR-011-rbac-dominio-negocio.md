# ADR-011 — Dominio de Negocio RBAC: Capacidades, Roles y Contratos de Implementación

**Estado:** Aceptada  
**Fecha:** 2026-07-08  
**Satisface:** ADR-001-rbac-piloto (condición de bloqueo: "no iniciar implementación funcional hasta contar con el ADR formal")

---

## Contexto

Los ADRs 001 al 010 definen las decisiones técnicas del motor RBAC pero ninguno constituye por sí solo el documento de negocio que requiere ADR-001-rbac-piloto. El circuito de implementación (Pre-Run → TDD → CI/CD → Regresión) necesita una única fuente de verdad que responda tres preguntas antes de escribir código de dominio:

1. **¿Qué sistemas externos usa RBAC?** → para definir los stubs (`StubIamAdapter`, `StubAuditWriter`)
2. **¿Cuáles son las reglas de negocio?** → para escribir los `.feature` files (Cucumber)
3. **¿Cuáles son los límites de la arquitectura interna?** → para definir las reglas AFF (dependency-cruiser)

Este ADR sintetiza las respuestas a partir de los ADRs 001–010, `discovery-rbac-core.md` y `design-handoff.md`. No introduce decisiones nuevas; consolida las existentes en formato consultable por la implementación.

---

## Decisión

Este documento constituye el ADR formal de negocio requerido por ADR-001-rbac-piloto. A partir de su aceptación el circuito de implementación puede avanzar.

---

## 1. Sistemas externos y stubs

RBAC depende de dos sistemas externos en runtime:

| Sistema | Interfaz de dominio | Impl. producción | Stub para tests |
|---|---|---|---|
| Entra ID (Microsoft) | `IamAdapter` | `OidcIamAdapter` (`openid-client`) | `StubIamAdapter` — mapea string tokens a `TokenClaims` sin criptografía |
| Base de datos / audit | `AppAuditWriter` | `AppAuditWriterService` (Lucid, insert-only) | `StubAuditWriter` — `Ref` en memoria, sin persistencia |

El `AgentRegistry` es configuración local versionada en código (`registry/agent-registry.ts`); no es un sistema externo y no necesita stub.

### 1.1. Contrato de IamAdapter

```typescript
// app/modules/rbac/domain/iam/iam-adapter.ts
export interface IamAdapter {
  /** @throws {AuthenticationError} token inválido, expirado o desconocido */
  authenticate(token: string): Promise<TokenClaims>
}
```

### 1.2. Contrato de AppAuditWriter

```typescript
// app/modules/rbac/domain/audit/app-audit-writer.ts
export interface AppAuditWriter {
  /** Insert-only — nunca actualiza ni elimina */
  write(entry: AuditEntry): Promise<void>
}
```

### 1.3. StubIamAdapter — formato de tokens de desarrollo

Para unit tests y desarrollo rápido el stub acepta tokens string con este formato:

| Token string | Subject generado |
|---|---|
| `analista-rm-norte` | `HumanSubject`, orgUnit=`RM-Norte`, caps de `analista` |
| `analista-rm-sur` | `HumanSubject`, orgUnit=`RM-Sur`, caps de `analista` |
| `supervisor-full` | `HumanSubject`, orgUnit=`*`, caps de `supervisor` |
| `operador-pagos` | `HumanSubject`, orgUnit=`*`, caps de `operador_pagos` |
| `auditor` | `HumanSubject`, orgUnit=`*`, caps de `auditor` |
| `admin-gobernanza` | `HumanSubject`, orgUnit=`*`, caps de `admin_gobernanza` |
| `job-pdn-pag-001` | `AgentSubject` (BatchJob), operation=`PDN-PAG-001` |
| `agent-afk-ts06` | `AgentSubject` (AFK), operation=`TS06`, environment=`dev` |
| `external-empleador` | `ExternalSubject`, caps de `empleador` |
| `unknown` | sin token → `AuthenticationError` |

---

## 2. Roles y matriz de capacidades

### 2.1. Mapeo Entra ID → BusinessRole

| Grupo Entra ID | BusinessRole (código) |
|---|---|
| `achs-analistas` | `analista` |
| `achs-supervisores` | `supervisor` |
| `achs-operadores-pago` | `operador_pagos` |
| `achs-admin-gobernanza` | `admin_gobernanza` |
| `achs-auditores` | `auditor` |

### 2.2. Matriz BusinessRole → CapabilitySet (humanos)

Un humano puede tener múltiples grupos Entra ID. Su `CapabilitySet` es la **unión** de todos sus roles.

| Capacidad | analista | supervisor | operador_pagos | admin_gobernanza | auditor |
|---|:---:|:---:|:---:|:---:|:---:|
| `prestacion:otorgar` | ✓ | | | ✓ | |
| `prestacion:denegar` | ✓ | | | ✓ | |
| `prestacion:consultar` | ✓ | ✓ | | ✓ | |
| `liquidacion:solicitar-cierre` | | | ✓ | ✓ | |
| `liquidacion:aprobar-cierre` | | ✓ | | ✓ | |
| `liquidacion:calcular` | | | ✓ | | |
| `liquidacion:consultar` | | ✓ | ✓ | ✓ | |
| `auditoria:leer` | | | | ✓ | ✓ |
| `rbac:administrar` | | | | ✓ | |
| `agente:gestionar-sesion-dev` | | | | ✓ | |

> **Nota:** `liquidacion:ejecutar-cierre` es capacidad exclusiva del BatchJob PDN-PAG-001 (ADR-007). Ningún humano la tiene.

### 2.3. Agentes batch y sus capacidades máximas

La capacidad efectiva de un agente es la **intersección** entre `token.roles` (Entra ID) y `AgentRegistry.allowedCapabilities`.

| Agente lógico | agentType | operation | Capacidades máximas |
|---|---|---|---|
| `pec2-job-pdn-pag-001` | BatchJob | PDN-PAG-001 | `job:ejecutar-ciclo-pago`, `liquidacion:calcular`, `liquidacion:consultar`, `liquidacion:generar-archivos`, `liquidacion:ejecutar-cierre`, `calculo:ejecutar`, `marco:resolver`, `incidente:crear-automatico` |
| `pec2-job-pdn-mon-005` | BatchJob | PDN-MON-005 | definido en `registry/agent-registry.ts` |
| `pec2-agent-afk-dev` | AFK | por TS (ej. TS-001-04) | subset de caps dev, definido en `dev_agent_sessions` (TTL 8h) |

### 2.4. Sujetos externos

| Sujeto | Capacidades |
|---|---|
| `empleador` | `hecho-causal:consultar-estado` |

---

## 3. Reglas de negocio críticas

### 3.1. Deny-by-default

`CapabilitySet` vacío → ninguna acción permitida. No hay capacidades heredadas ni implícitas. La ausencia de una capacidad es una denegación.

### 3.2. Cierre mensual con doble firma (ADR-007)

Flujo canónico (no puede ser ejecutado por una sola persona):

```
Operador Pagos → liquidacion:solicitar-cierre
Supervisor     → liquidacion:aprobar-cierre    (debe existir solicitud vigente)
BatchJob PAG   → liquidacion:ejecutar-cierre   (debe existir aprobación vigente)
```

**Reglas:**
- Un Operador no puede aprobar su propia solicitud.
- Un Supervisor no puede ejecutar el cierre final.
- El BatchJob no puede ejecutar cierre sin aprobación vigente para el período.
- La aprobación persiste en `monthly_close_approvals` con: `approvedBy`, `approvedAt`, `periodo`, `requestId`, hash de preliquidación.

### 3.3. Otros flujos de doble firma (misma lógica)

| Flujo | Capability "solicitar" | Capability "aprobar" | Executor |
|---|---|---|---|
| Ajuste manual | `liquidacion:solicitar-ajuste-manual` | `liquidacion:aprobar-ajuste-manual` | BatchJob o Admin Gobernanza |
| Reajuste masivo IPC | `liquidacion:solicitar-reajuste-ipc` | `liquidacion:aprobar-reajuste-ipc` | BatchJob |
| Anulación de cierre | `liquidacion:solicitar-anulacion-cierre` | `liquidacion:aprobar-anulacion-cierre` | Admin Gobernanza |

### 3.4. Relación de sujeto con recursos

La verificación `requireRelation(capability, resourceId)` valida que el sujeto tenga acceso al recurso por `orgUnit` o por `assignedCaseIds`. Aplica a:
- `analista` → accede a casos de su `orgUnit`
- `supervisor` → accede a casos de su `orgUnit` (puede ser `*` para supervisión global)
- HITL → accede solo a los `resourceId` listados en `hitl_delegations`

### 3.5. Contratos de error (stable)

| Código | HTTP | Cuándo |
|---|---|---|
| `unauthenticated` | 401 | Token inválido, expirado, ausente o claims incompletos |
| `access_denied` | 403 | Capacidad no está en `CapabilitySet` del sujeto |
| `relation_violation` | 403 | Capacidad presente pero recurso fuera del scope de relación |

Estos códigos no cambian. Los clientes frontend y los tests los refieren por string literal.

---

## 4. Reglas AFF (Architectural Fitness Functions)

Estas reglas se codifican en `dependency-cruiser` (`.dependency-cruiser.cjs`):

### 4.1. Dirección de imports permitida

```
app/middleware/*
  → domain/iam/*          (valida tokens)
  → domain/access-context/* (construye AccessContext)
  → Adonis HTTP            (HttpContext, middleware)
  ↛ domain/authorization/* (no importa AuthorizationService directamente)
  ↛ use-cases de dominio   (middleware no conoce negocio)

domain/access-context/*
  → domain/iam/*           (consume TokenClaims)
  → domain/registry/*      (consulta AgentRegistry)
  ↛ Adonis, Lucid, HTTP

domain/authorization/*
  → @achs/rbac-contracts   (Tag + errores)
  ↛ domain/iam/*           (no conoce JWT)
  ↛ Adonis, Lucid, HTTP

domain/iam/*
  ↛ Adonis, Lucid, domain/* (solo openid-client y tipos locales)

domain/audit/*
  → Lucid                  (insert-only)
  ↛ domain/iam/*
  ↛ domain/access-context/*
```

### 4.2. Regla anti-circular

No hay dependencias circulares entre `domain/iam`, `domain/access-context`, `domain/authorization`, `domain/audit` y `domain/registry`.

### 4.3. Regla de pureza de contratos

Los archivos en `#rbac/contracts` (el barrel de contratos públicos) solo pueden importar `effect`. No pueden importar `@adonisjs/*`, `lucid-orm`, `openid-client` ni `pec-*`.

---

## 5. Alcance del piloto (F0–F1)

Lo que se implementa en este piloto:

| Componente | Estado en piloto |
|---|---|
| `IamAdapter` interface + `StubIamAdapter` | Implementado |
| `AppAuditWriter` interface + `StubAuditWriter` | Implementado |
| `AccessContextBuilder` (`TokenClaims → AccessContext`) | Implementado |
| `humanCapabilityMap` + `externalCapabilityMap` | Implementado |
| `AgentRegistry` (static, solo PDN-PAG-001) | Implementado |
| `AuthorizationService` (deny-by-default) | Implementado |
| Middlewares `RbacApiAuthMiddleware` + `RbacWebAuthMiddleware` | Implementados |
| Tablas `app_audit` + `monthly_close_approvals` | Implementadas |
| `OidcIamAdapter` contra Entra ID real | Diferido (F2) |
| `dev_agent_sessions` y `hitl_delegations` | Diferido (F2) |
| Flujos de doble firma para ajuste/reajuste/anulación | Diferido (F2) |

---

## Consecuencias

- **Positivas:** la implementación tiene un único punto de entrada que responde qué construir, qué stubear y qué regla AFF enforcar.
- **Positivas:** los `.feature` files pueden escribirse directamente contra la matriz de capacidades de la sección 2.2.
- **Positivas:** los stubs tienen contratos explícitos con tokens deterministas; cualquier test sabe exactamente qué `AccessContext` genera cada token.
- **Negativas:** la matriz de capacidades de la sección 2.2 debe mantenerse sincronizada con `capability-map.test.ts` y `humanCapabilityMap`. Si divergen, el test de referencia es este ADR.
- **Negativas:** `liquidacion:cerrar-ciclo` presente en `capability-map.test.ts` es obsoleto (ADR-007). Ese archivo de referencia debe actualizarse en la tarea de implementación del capability-map.

---

## Referencias

- ADR-001-iam-entra-id: Identity Provider, `IamAdapter`, flujos OIDC y Client Credentials
- ADR-002: Estrategia de mock (StubIamAdapter, mock OIDC local)
- ADR-004: Middleware pipeline, `RbacApiAuthMiddleware`, `RbacWebAuthMiddleware`
- ADR-005: Mapeo `TokenClaims → Subject → AccessContext`, validación estricta de claims
- ADR-006: Runtime de agentes, workers fuera de RBAC, `AgentRegistry`
- ADR-007: Cierre mensual doble firma — `solicitar-cierre`, `aprobar-cierre`, `ejecutar-cierre`
- ADR-008: Modelo de datos mínimo, `app_audit` (insert-only), `monthly_close_approvals`
- ADR-010: Monolito modular AdonisJS + Inertia, estructura de módulos
- `discovery-rbac-core.md`: actores, flujos completos, tokens de desarrollo
- `design-handoff.md`: 16 decisiones de diseño, contratos, invariantes
- `capability-map.test.ts`: tests de referencia (requiere actualización post ADR-007)
