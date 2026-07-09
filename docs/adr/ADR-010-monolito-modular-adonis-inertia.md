# ADR-010 — Monolito Modular AdonisJS + Inertia + React

**Estado:** Aceptada
**Reemplaza:** ADR-003 (consumo de `@achs/pec-contracts`), ADR-009 (scaffolding monorepo con SPA separada)

## Contexto

La arquitectura original de `skeleton-rbac` asumía tres piezas separadas:

1. `@achs/rbac-contracts` — paquete npm publicado con los tipos de dominio.
2. `rbac-engine` — servicio backend deployable que implementa la autorización.
3. Una SPA de gobernanza independiente (`rbac-front`, React + Vite) consumiendo la API del engine.

Los prototipos validaron dos cosas que cambian esa premisa:

- **Runtime:** la comparación `rbac-ts-plain` vs `rbac-effect` (ver [`prototypes/doc/comparacion-prototipos.md`](../../prototypes/doc/comparacion-prototipos.md)) concluyó a favor de TypeScript puro. Effect quedó descartado; con él desaparecen los Tags, Layers y `ManagedRuntime` que justificaban parte de la estructura.
- **Frontera front/back:** mantener una SPA separada obligaba a publicar contratos como paquete npm, duplicar autenticación (sesión BFF + API) y sincronizar dos deploys para una consola de gobernanza con un solo equipo detrás.

## Decisión

El prototipo vigente (`prototypes/rbac-monolyte/`) es un **monolito modular AdonisJS 7 + Inertia + React** en un solo deployable. RBAC es un módulo interno con límites explícitos, no un servicio ni un paquete publicado.

### Estructura

```
rbac-monolyte/
├── app/
│   ├── modules/rbac/            # módulo RBAC — único dueño del dominio de autorización
│   │   ├── contracts/           # Subject, Capability, AccessContext, errores, AuthorizationService
│   │   ├── domain/
│   │   │   ├── iam/             # IamAdapter + StubIamAdapter + fixtures fieles a Entra ID
│   │   │   ├── access-context/  # claimsToSubject, capability-map, buildAccessContext
│   │   │   ├── authorization/   # AuthorizationServiceImpl (+ stub)
│   │   │   ├── registry/        # AgentRegistry
│   │   │   ├── audit/           # AppAuditWriter (+ stub)
│   │   │   └── container.ts     # DI manual: composición de adapters
│   │   └── http/                # middleware, controllers, DTOs — frontera Adonis
│   ├── controllers/             # controllers no-RBAC de la app
│   └── middleware/
├── inertia/                     # front React renderizado vía Inertia
│   ├── pages/rbac/              # mi-acceso, matriz, simulador, auditoria
│   ├── pages/auth/              # rbac-login
│   ├── components/rbac/
│   └── lib/rbac/
└── start/routes.ts              # rutas /rbac/* protegidas por middleware.rbacAuth()
```

### Reglas del límite modular

1. Los contratos viven en `app/modules/rbac/contracts/` y se importan **solo** vía el subpath `#rbac/contracts`. No hay paquete npm: el import alias es el límite.
2. El resto de la app (controllers, otros módulos, páginas Inertia via props) consume tipos de `#rbac/contracts` y el servicio vía `container` — nunca importa desde `#rbac/domain/*` internals salvo el middleware y controllers del propio módulo.
3. `domain/` no importa nada de Adonis ni de `http/`. La dirección de dependencia es `http → domain → contracts`.
4. El front no autoriza: Inertia entrega el `AccessContext` serializado (DTO) como props y las páginas lo usan solo para UX (mostrar/ocultar acciones). La decisión final sigue en backend (`authz.require`).
5. DI manual por constructor en `container.ts`. Sin contenedor mágico, sin Layers.

### API-first: la web Inertia es un consumidor más

El consumidor dominante del backend no es la UI — son los **cientos de agentes** (jobs batch, AFK, HITL, sistemas externos) que consumirán los servicios vía Bearer/Client Credentials. Eso invierte la relación:

1. **La API JSON bajo `/api/*` es la superficie primaria.** Todo caso de uso se expone primero como endpoint JSON; los DTOs (`AccessContextDto`, etc.) son el contrato público y se versionan como tal (agregar campo = compatible; renombrar/eliminar = breaking). Los errores llevan código estable (`unauthenticated`, `access_denied`, `relation_violation`) — los consumidores deciden por `code`, no parseando mensajes.
2. **La web Inertia consume lo mismo que un agente.** Sus controllers son una capa delgada de presentación sobre los mismos servicios de dominio; no existen endpoints privilegiados ni lógica de negocio exclusiva de la UI. Si la UI puede hacerlo, un agente autorizado también.
3. **Separación por prefijo, no por deploy:** `/api/*` responde siempre JSON (401/403 con cuerpo de error, nunca redirect); las rutas web responden Inertia (redirect a login, flash messages). Implementado con un middleware por superficie (`RbacApiAuthMiddleware` / `RbacWebAuthMiddleware`) y mapeo central de errores de dominio en el exception handler — detalle en ADR-004.
4. **La autenticación difiere, la autorización no:** agentes usan Bearer (Client Credentials); la web usa sesión BFF, y con esa misma cookie consume `/api/*` como un cliente más (el navegador nunca tiene el token, por eso la API acepta Bearer con fallback a sesión). Ambos convergen en el mismo pipeline `authenticate → buildAccessContext → authz.require`. No hay camino privilegiado.

El contrato de superficies está protegido por tests funcionales (`tests/functional/rbac_surfaces.spec.ts`).

Esta regla es la que preserva la opción de extraer el servicio más adelante: si la UI solo consume APIs, separar el deploy es mover archivos, no reescribir contratos.

### Qué se conserva de las decisiones previas

- [ADR-001](ADR-001-iam-entra-id.md) (Entra ID vía OIDC estándar, `IamAdapter`), [ADR-002](ADR-002-mock-strategy.md) (stub + mock OIDC), [ADR-004](ADR-004-middleware-pipeline.md) (middleware con doble fuente de credencial), [ADR-005](ADR-005-token-mapping.md) (mapeo estricto claims → AccessContext), [ADR-006](ADR-006-agent-worker-runtime.md) (workers fuera del RBAC), [ADR-007](ADR-007-cierre-mensual-doble-firma.md) (doble firma) y [ADR-008](ADR-008-modelo-datos-rbac.md) (modelo de datos mínimo) siguen vigentes; 001/002/004 se actualizaron para eliminar las firmas Effect.
- ADR-006 encaja incluso mejor: los workers son procesos separados del mismo monolito, importando el mismo módulo `#rbac/*`.

### Dónde viven las reglas de negocio

Este ADR decide arquitectura técnica; las reglas de negocio de autorización están delegadas. Para quien llega solo a este documento, el mapa completo es:

| Qué | Dónde |
|---|---|
| Roles de negocio (`analista`, `supervisor`, `operador_pagos`, `admin_gobernanza`, `auditor`) y mapeo grupo Entra ID → `BusinessRole` | [`doc/discovery-rbac-core.md`](../discovery-rbac-core.md) §3.2 |
| Matrices rol → capabilities (quién puede hacer qué: humanos §3.2, externos §3.3, agentes §3.4) | [`rbac_humano_agente.md`](../../../rbac_humano_agente.md) (raíz del repo) |
| Capability-map materializado en código | [`capability-map.ts`](../../prototypes/rbac-monolyte/app/modules/rbac/domain/access-context/capability-map.ts) + su test unitario |
| Mapeo claims → `Subject` → `AccessContext` (validación estricta, `ClaimsValidationError`) | [ADR-005](ADR-005-token-mapping.md) |
| Modelo de datos mínimo (`app_audit`, `monthly_close_approvals`; sin tablas `users`/`roles` en F0-F1) | [ADR-008](ADR-008-modelo-datos-rbac.md) |
| Reglas de agentes: `effectiveCapabilities = token.roles ∩ AgentRegistry.allowedCapabilities` | [`doc/discovery-rbac-core.md`](../discovery-rbac-core.md) §3.4 y [ADR-006](ADR-006-agent-worker-runtime.md) |

### Qué queda obsoleto

| Pieza anterior | Reemplazo |
|---|---|
| `@achs/rbac-contracts` / `@achs/pec-contracts` como paquete publicado (ADR-003, ADR-009) | `#rbac/contracts` inline en el módulo |
| SPA `rbac-front` separada (React + Vite standalone) | Páginas Inertia en `inertia/pages/rbac/` |
| Effect Tags / Layers / `ManagedRuntime` | Interfaces TS + DI manual (`container.ts`) |
| Monorepo `packages/rbac-contracts` + `rbac-engine` | Un solo proyecto AdonisJS con módulo interno |

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| Mantener SPA separada + API | Doble deploy, doble auth, paquete de contratos publicado — costo sin beneficio a esta escala |
| Microservicio RBAC standalone | El único consumidor hoy es el propio monolito PEC2; la frontera modular da la misma disciplina sin red |
| Extraer contratos a paquete npm desde ya | Prematuro. Si un consumidor externo aparece (otro motor, SPA PEC), `contracts/` está aislado y se extrae con costo bajo |

## Consecuencias

- **Positivas:** un solo deploy, una sola sesión (BFF nativo: el token nunca llega al navegador), tipos compartidos entre back y front sin publicar nada.
- **Positivas:** el límite modular (`#rbac/*` + regla de dirección de dependencia) preserva la opción de extraer el módulo a servicio o paquete más adelante; la regla API-first hace lo mismo con el deploy de la UI.
- **Negativas:** la disciplina del límite es por convención de imports, no por frontera física de paquete — requiere revisión en PRs (o una regla de lint de boundaries).
- **Negativas:** API-first con cientos de agentes exige resolver pronto lo que una UI sola podía postergar: validación OIDC real (Client Credentials), rate limiting por agente, caching de validación de tokens/JWKS y volumen de auditoría.
- **Negativas:** escalar el front fuera de la consola de gobernanza (p. ej. la SPA PEC completa) reabriría la discusión de contratos publicados.

## Referencias

- [`prototypes/doc/comparacion-prototipos.md`](../../prototypes/doc/comparacion-prototipos.md) — evidencia rbac-ts-plain vs rbac-effect
- [`prototypes/doc/front-rbac-discovery.md`](../../prototypes/doc/front-rbac-discovery.md) — discovery del front (la decisión de "consola independiente" queda superada por este ADR)
- [`rbac_humano_agente.md`](../../../rbac_humano_agente.md) — matrices rol → capabilities (fuente de las reglas de negocio)
- [ADR-003](ADR-003-contracts-consumer.md), [ADR-009](ADR-009-scaffolding-rbac-core.md) — reemplazados
- [AdonisJS + Inertia](https://docs.adonisjs.com/guides/views-and-templates/inertia)
