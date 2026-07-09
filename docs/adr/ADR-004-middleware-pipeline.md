# ADR-004 — Middleware Pipeline de Autorización para AdonisJS

**Estado:** Aceptada (actualizada con la separación de superficies de ADR-010)

## Contexto

El motor de autorización debe interceptar cada request HTTP entrante, autenticar al sujeto, construir un `AccessContext` y dejarlo disponible para los controllers y use-cases del engine.

AdonisJS 7 tiene un sistema de middleware nativo con `HttpContext`. El `AccessContext` debe fluir desde el middleware HTTP hasta el `AuthorizationService` sin que el controller escriba código repetitivo.

Con la decisión API-first (ADR-010), el backend expone dos superficies con comportamientos de error incompatibles: los agentes que consumen `/api/*` necesitan JSON con códigos estables, y la web Inertia necesita redirects y flash messages. Un middleware único que negocia por request resultó menos claro que un middleware por superficie.

## Decisión

Se implementan **dos middlewares de AdonisJS**, uno por superficie, registrados en `start/kernel.ts`:

| Middleware | Rutas | Credencial | Falla de auth |
|---|---|---|---|
| `RbacApiAuthMiddleware` (`middleware.rbacApiAuth()`) | `/api/*` | `Bearer` (gana) con fallback a sesión | **401 JSON** `{ code: 'unauthenticated', message }` — nunca redirect |
| `RbacWebAuthMiddleware` (`middleware.rbacWebAuth()`) | rutas web `/rbac/*` | Solo sesión (`rbac.token`) | Redirect a `/auth/rbac-login` + flash |

Ambos ejecutan el mismo pipeline:

1. Obtiene la credencial según la superficie
2. Invoca `IamAdapter.authenticate(token)` → `TokenClaims`
3. Invoca `buildAccessContext(claims)` → `AccessContext`
4. Adjunta el `AccessContext` al `HttpContext` (augmentación única en `http/context.ts`)
5. El controller lo extrae con `requireAccessContext()` y lo pasa a `authz.require(ctx, capability)` / `authz.requireRelation(ctx, capability, resourceId)`

### 4.0. Fuentes de credencial por superficie

- **API (`/api/*`):** `Authorization: Bearer <token>` para agentes, jobs y sistemas externos. Fallback a la cookie de sesión para que la web Inertia consuma los mismos endpoints — el navegador nunca tiene el token (patrón BFF, ADR-001 y skeleton-rbac-front ADR-001), así que su única credencial posible es la sesión. Bearer explícito gana.
- **Web (`/rbac/*`):** solo sesión. Un Bearer en una ruta web se ignora (verificado por test funcional).

Ambas fuentes convergen en el mismo pipeline (`authenticate → build → AccessContext`) — no hay camino privilegiado.

### 4.1. Middleware API

```typescript
// app/modules/rbac/http/middleware/rbac_api_auth_middleware.ts
export default class RbacApiAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const credential = this.extractCredential(ctx)

    if (!credential) {
      return this.unauthorized(ctx, 'Credencial requerida (Bearer o sesion)')
    }

    try {
      const claims = await container.iam.authenticate(credential.token)
      ctx.accessContext = buildAccessContext(claims)
    } catch (error) {
      // Token inválido y claims incompletos → mismo tratamiento (no filtrar información)
      if (error instanceof AuthenticationError || error instanceof ClaimsValidationError) {
        if (credential.source === 'session') {
          ctx.session.forget('rbac.token')
        }
        return this.unauthorized(ctx, 'Credencial invalida o expirada')
      }

      throw error
    }

    return next()
  }

  private extractCredential(
    ctx: HttpContext
  ): { token: string; source: 'bearer' | 'session' } | null {
    const header = ctx.request.header('authorization')
    if (header) {
      const [type, token] = header.split(' ')
      if (type === 'Bearer' && token) return { token, source: 'bearer' }
    }

    const sessionToken = ctx.session.get('rbac.token', null)
    if (sessionToken) return { token: sessionToken, source: 'session' }

    return null
  }

  private unauthorized(ctx: HttpContext, message: string) {
    return ctx.response.unauthorized({ code: 'unauthenticated', message })
  }
}
```

El middleware web (`rbac_web_auth_middleware.ts`) es el mismo pipeline con credencial solo-sesión y redirect + flash en la falla.

### 4.2. Mapeo central de errores de dominio → HTTP

Los controllers **no** capturan errores de autorización. `HttpExceptionHandler` (`app/exceptions/handler.ts`) hace el mapeo en un solo lugar, discriminando por prefijo de ruta:

| Error de dominio | `/api/*` | Web |
|---|---|---|
| `AccessDeniedError` | 403 `{ code: 'access_denied', message, capability }` | 403 página Inertia `errors/forbidden` |
| `RelationViolationError` | 403 `{ code: 'relation_violation', message, capability, resourceId }` | 403 página Inertia `errors/forbidden` |
| `AuthenticationError` / `ClaimsValidationError` | 401 `{ code: 'unauthenticated', message }` | Redirect a `/auth/rbac-login` |

Los códigos (`unauthenticated`, `access_denied`, `relation_violation`) son parte del contrato público de la API: los consumidores automatizados deciden por `code`, no parseando `message`.

Además, `report()` degrada estos errores a log nivel info: son resultados esperados del pipeline (la denegación ya queda en el audit con contexto completo), no fallas del sistema.

### 4.3. Uso en el controller

```typescript
// app/modules/rbac/http/controllers/...
import { container } from '#rbac/domain/container'
import { requireAccessContext } from '#rbac/http/require_access_context'

export default class PrestacionController {
  async otorgar({ request, accessContext }: HttpContext) {
    const ctx = requireAccessContext(accessContext)
    const cmd = request.body() as OtorgarPrestacionCmd

    // AccessDeniedError / RelationViolationError propagan al exception handler → 403
    container.authz.require(ctx, 'prestacion:otorgar')
    container.authz.requireRelation(ctx, 'prestacion:otorgar', cmd.hechoCausalId)
    // ...
  }
}
```

`requireAccessContext()` lanza `AuthenticationError` (→ 401) si el contexto falta — protege contra una ruta registrada por error sin middleware, en lugar de un cast silencioso.

### 4.4. Flujo completo

```
HTTP Request
  │
  ├─ /api/*  → RbacApiAuthMiddleware   (Bearer gana, fallback sesión; falla → 401 JSON)
  ├─ /rbac/* → RbacWebAuthMiddleware   (solo sesión; falla → redirect login)
  │   │
  │   ├─ IamAdapter.authenticate(token) → TokenClaims
  │   ├─ buildAccessContext(claims) → AccessContext
  │   └─ ctx.accessContext = accessContext
  │
  ├─ Controller / use-case
  │   ├─ requireAccessContext(ctx.accessContext)
  │   ├─ authz.require(ctx, cap)              → throw AccessDeniedError
  │   └─ authz.requireRelation(ctx, cap, id)  → throw RelationViolationError
  │
  └─ HttpExceptionHandler (mapeo central)
      ├─ /api/* → 403/401 JSON con code estable
      └─ web    → página forbidden / redirect login
```

El contrato de superficies está fijado por tests funcionales (`tests/functional/rbac_surfaces.spec.ts`): sin credencial → 401 JSON nunca redirect, deny-by-default con token desconocido, 403 con `code` y `capability`, y Bearer inservible en la superficie web.

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| Un middleware único que negocia JSON/redirect por request | Menos claro que un middleware por superficie; la tabla de rutas deja explícito qué contrato de error aplica |
| Negociar por header `Accept` en lugar de prefijo de ruta | Los agentes no siempre envían `Accept` correcto; el prefijo es determinístico y auditable |
| try/catch de errores de dominio en cada controller | Duplicación en cada endpoint; el exception handler es el punto único de mapeo |
| Usar el sistema de guards de AdonisJS | Los guards son para rutas; la autorización por capacidad es más granular (a nivel de use-case, no de ruta) |
| AccessContext en estado global/singleton por request | Rompe la inmutabilidad y el aislamiento; cada request tiene su propio AccessContext explícito |

## Consecuencias

- **Positivas:** el controller es delgado: `requireAccessContext` + `authz.require`, sin try/catch. Toda la lógica de auth está en middleware + exception handler + servicio.
- **Positivas:** el contrato de error de la API (`code` estable) es apto para consumidores automatizados y está protegido por tests funcionales.
- **Positivas:** agregar una ruta nueva no puede inventar un manejo de error distinto — el mapeo es central.
- **Negativas:** dos middlewares comparten el pipeline `authenticate → build` por duplicación controlada; si crece, se extrae a una base común.
- **Negativas:** el `HttpContext.accessContext` es un "aumento" del tipo de AdonisJS — centralizado en `http/context.ts`, pero sigue siendo augmentación global.

## Referencias

- ADR-001: Entra ID como IAM
- ADR-002: Estrategia de mock
- ADR-010: Monolito modular AdonisJS + Inertia (sección API-first)
- `rbac_humano_agente.md` sección 7.1 (construcción para HTTP)
- `#rbac/contracts` — `AccessContext`, `AuthorizationService`, errores de dominio
- `tests/functional/rbac_surfaces.spec.ts` — contrato de superficies
