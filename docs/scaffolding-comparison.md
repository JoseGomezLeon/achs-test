# Scaffolding RBAC: Effect-TS vs TypeScript puro

Comparación lado a lado de ambas implementaciones para la misma arquitectura definida en ADR-001..009.
La estructura de módulos, contratos y reglas de frontera son idénticas en ambos enfoques — solo cambia el estilo de composición y manejo de errores.

---

## Árbol de archivos (idéntico en ambos)

```
skeleton-rbac/
├── package.json                          # npm workspaces
├── tsconfig.base.json
├── docker-compose.yml
│
├── packages/
│   ├── rbac-contracts/                   # @achs/rbac-contracts — publicado
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── subject.ts
│   │       ├── capability.ts
│   │       ├── access-context.ts
│   │       ├── errors.ts                 # ← difiere entre enfoques
│   │       └── authorization.ts          # ← difiere entre enfoques
│   │
│   └── rbac-engine/                      # deployable, no publicado
│       ├── package.json
│       ├── Dockerfile
│       └── src/
│           ├── domain/
│           │   ├── app-context.ts        # ← difiere
│           │   ├── run-effect.ts         # solo existe en enfoque Effect
│           │   ├── iam/
│           │   │   ├── iam-adapter.ts    # ← difiere (interface)
│           │   │   ├── token-claims.ts
│           │   │   ├── oidc-iam-adapter.ts
│           │   │   └── stub-iam-adapter.ts
│           │   ├── access-context/
│           │   │   ├── access-context-builder.ts  # ← difiere
│           │   │   ├── claims-to-subject.ts
│           │   │   ├── capability-map.ts
│           │   │   └── relation-context-builder.ts
│           │   ├── authorization/
│           │   │   ├── authorization-service.ts   # ← difiere
│           │   │   └── authorization-service-stub.ts
│           │   ├── registry/
│           │   │   ├── agent-registry.ts
│           │   │   └── agent-registry-lookup.ts
│           │   └── audit/
│           │       ├── app-audit-writer.ts
│           │       └── app-audit-writer-stub.ts
│           └── app/
│               ├── middleware/
│               │   └── auth-middleware.ts  # ← difiere
│               └── controllers/
│                   └── prestacion-controller.ts  # ← difiere
└── doc/
```

---

## Pros y Contras

### Effect-TS

**Pros**

| #   | Beneficio                                    | Detalle                                                                                                                                                |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Errores visibles en el tipo de retorno       | `Effect<AccessContext, ClaimsValidationError>` — el compilador obliga a manejar el error; no se puede ignorar sin `Effect.ignore` explícito            |
| 2   | Composición declarativa                      | `pipe(authenticate, flatMap(build), tap(audit))` — la cadena de pasos es legible y cada paso es testeable en aislamiento                               |
| 3   | Dependency injection tipada                  | `Context.GenericTag` + `Layer` garantizan en compilación que el Layer provee todas las dependencias; no hay `undefined` en runtime por DI mal cableada |
| 4   | Retry, timeout y concurrencia integrados     | Si en el futuro `IamAdapter` necesita retry con backoff o el audit writer necesita buffer, es un `pipe` adicional — no requiere reescribir la firma    |
| 5   | Stubs intercambiables sin mocks de framework | Reemplazar `OidcIamAdapterLayer` por `StubIamAdapterLayer` es una línea en `AppLayer`; no se necesita `jest.mock` ni monkey-patching                   |

**Contras**

| #   | Costo                                            | Detalle                                                                                                                                           |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dependencia pesada en `rbac-contracts`           | `effect` (~500 KB minificado) va como `peerDependency` de `rbac-contracts`. La SPA y `pec-engine` lo arrastran aunque no usen Effect directamente |
| 2   | Curva de aprendizaje alta                        | `Effect.gen`, `Layer`, `Context.GenericTag`, `Exit`, `Cause` — un dev TypeScript sénior sin Effect tarda 1-2 semanas en ser productivo            |
| 3   | Boilerplate visible en código de infraestructura | `Effect.runPromiseExit` + `Exit.isFailure` en el middleware es más verboso que `try/catch`                                                        |
| 4   | Errores de compilación crípticos                 | Los tipos de Effect son genéricos profundos; un error de tipo produce mensajes difíciles de leer                                                  |
| 5   | Overhead de runtime mínimo pero real             | Cada `Effect.gen` construye una estructura de datos antes de ejecutarse. Irrelevante en la mayoría de casos, pero existe                          |

---

### TypeScript puro + excepciones

**Pros**

| #   | Beneficio                                         | Detalle                                                                                                   |
| --- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Sin dependencias en `rbac-contracts`              | El paquete publicado solo contiene tipos TypeScript nativos — cero dependencias de runtime                |
| 2   | Curva de aprendizaje cero                         | Cualquier dev TypeScript lee `async/await` + `try/catch` + clases de error desde el día uno               |
| 3   | Debuggable con herramientas estándar              | Stack traces normales, breakpoints en VS Code/Node inspector, sin necesidad de entender la pila de Effect |
| 4   | Menos código en infraestructura                   | El middleware con `try/catch` es más corto y directo que el equivalente con `runPromiseExit`              |
| 5   | Compatible con cualquier librería sin adaptadores | `openid-client`, Lucid, cualquier SDK de terceros se usa directamente sin wrappers Effect                 |

**Contras**

| #   | Costo                                     | Detalle                                                                                                                                         |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Errores no visibles en el tipo de retorno | `buildAccessContext(claims): AccessContext` — el compilador no sabe que puede lanzar `ClaimsValidationError`; hay que leer la JSDoc o el código |
| 2   | DI manual es frágil si crece              | Constructor injection a mano escala hasta ~5 dependencias; más allá se vuelve tedioso y propenso a errores de cableado                          |
| 3   | Retry/timeout requieren código adicional  | Si `OidcIamAdapter` necesita retry, hay que escribirlo (o importar `p-retry`, otra dependencia)                                                 |
| 4   | Stubs requieren más disciplina de test    | Sin `Layer`, hay que pasar stubs por constructor en cada test; fácil pero más verboso                                                           |
| 5   | Fácil ignorar errores sin querer          | `const ctx = buildAccessContext(claims)` sin `try/catch` compila — solo falla en runtime                                                        |

---

## Scaffolding A — Effect-TS

### `rbac-contracts/package.json`

```json
{
  "name": "@achs/rbac-contracts",
  "version": "1.0.0",
  "type": "module",
  "exports": { ".": "./dist/index.js" },
  "dependencies": {
    "effect": "^3.10.0"
  }
}
```

### `rbac-contracts/src/errors.ts`

```typescript
import { Data } from 'effect'

export class AuthenticationError extends Data.TaggedError('AuthenticationError')<{
  readonly reason: 'invalid_token' | 'expired' | 'issuer_mismatch'
  readonly message: string
}> {}

export class ClaimsValidationError extends Data.TaggedError('ClaimsValidationError')<{
  readonly missing: ReadonlyArray<string>
  readonly subjectKind: 'human' | 'agent' | 'external'
}> {}

export class AccessDeniedError extends Data.TaggedError('AccessDeniedError')<{
  readonly capability: string
  readonly subjectKind: string
  readonly denialReason: string
}> {}

export class RelationViolationError extends Data.TaggedError('RelationViolationError')<{
  readonly capability: string
  readonly resourceId: string
}> {}
```

### `rbac-contracts/src/authorization.ts`

```typescript
import { Context, Effect } from 'effect'
import type { AccessContext } from './access-context.js'
import type { Capability } from './capability.js'
import type { AccessDeniedError, RelationViolationError } from './errors.js'

export interface AuthorizationService {
  require(ctx: AccessContext, capability: Capability): Effect.Effect<void, AccessDeniedError>

  requireRelation(
    ctx: AccessContext,
    capability: Capability,
    resourceId: string
  ): Effect.Effect<void, AccessDeniedError | RelationViolationError>
}

export const AuthorizationService = Context.GenericTag<AuthorizationService>('AuthorizationService')
```

### `rbac-engine/src/domain/iam/iam-adapter.ts`

```typescript
import { Context, Effect } from 'effect'
import type { TokenClaims } from './token-claims.js'
import type { AuthenticationError } from '@achs/rbac-contracts'

export interface IamAdapter {
  authenticate(token: string): Effect.Effect<TokenClaims, AuthenticationError>
}

export const IamAdapter = Context.GenericTag<IamAdapter>('IamAdapter')
```

### `rbac-engine/src/domain/iam/stub-iam-adapter.ts`

```typescript
import { Effect, Layer } from 'effect'
import { IamAdapter } from './iam-adapter.js'
import type { TokenClaims } from './token-claims.js'

export const makeStubIamAdapter = (fixture: TokenClaims) =>
  Layer.succeed(IamAdapter, IamAdapter.of({ authenticate: (_token) => Effect.succeed(fixture) }))
```

### `rbac-engine/src/domain/access-context/access-context-builder.ts`

```typescript
import { Effect } from 'effect'
import { ClaimsValidationError } from '@achs/rbac-contracts'
import type { TokenClaims } from '../iam/token-claims.js'
import type { AccessContext } from '@achs/rbac-contracts'

const required = <T>(
  value: T | undefined,
  field: string,
  kind: 'human' | 'agent' | 'external'
): Effect.Effect<T, ClaimsValidationError> =>
  value !== undefined
    ? Effect.succeed(value)
    : Effect.fail(new ClaimsValidationError({ missing: [field], subjectKind: kind }))

export const buildAccessContext = (
  claims: TokenClaims
): Effect.Effect<AccessContext, ClaimsValidationError> =>
  Effect.gen(function* () {
    const subject = yield* claimsToSubject(claims)
    return {
      subject,
      capabilities: getCapabilities(subject, claims),
      relations: buildRelationContext(subject),
      requestId: claims.jti ?? crypto.randomUUID(),
      issuedAt: new Date(),
    }
  })

const claimsToSubject = (claims: TokenClaims) =>
  Effect.gen(function* () {
    if (claims.externalType) {
      const sub = yield* required(claims.sub, 'sub', 'external')
      return {
        kind: 'external' as const,
        externalId: sub,
        externalType: claims.externalType,
        authenticatedVia: 'api_key' as const,
      }
    }
    if (claims.oid && claims.email) {
      const orgUnit = yield* required(claims.extension_orgUnit, 'extension_orgUnit', 'human')
      return {
        kind: 'human' as const,
        userId: claims.oid,
        email: claims.email,
        businessRoles: mapGroupsToRoles(claims.groups ?? []),
        orgUnit,
        authenticatedVia: 'sso' as const,
      }
    }
    const agentId = yield* required(claims.appId ?? claims.azp, 'appId|azp', 'agent')
    const environment = yield* required(claims.environment, 'environment', 'agent')
    const registration = findAgentRegistration(agentId)
    return {
      kind: 'agent' as const,
      agentId,
      agentType: registration?.agentType ?? 'ExternalSystem',
      operationScope: { operation: registration?.operation ?? 'unregistered', environment },
      invokedBy: claims.invokedBy,
      environment,
    }
  })
```

### `rbac-engine/src/domain/authorization/authorization-service.ts`

```typescript
import { Effect, Layer } from 'effect'
import {
  AuthorizationService,
  AccessDeniedError,
  RelationViolationError,
} from '@achs/rbac-contracts'

const make: AuthorizationService = {
  require(ctx, capability) {
    if (!ctx.capabilities.has(capability)) {
      return Effect.fail(
        new AccessDeniedError({
          capability,
          subjectKind: ctx.subject.kind,
          denialReason: 'capability not in set',
        })
      )
    }
    return Effect.void
  },

  requireRelation(ctx, capability, resourceId) {
    return Effect.gen(function* () {
      yield* make.require(ctx, capability)
      const allowed = checkRelation(ctx, resourceId)
      if (!allowed) yield* Effect.fail(new RelationViolationError({ capability, resourceId }))
    })
  },
}

export const AuthorizationServiceLive = Layer.succeed(AuthorizationService, make)

export const AuthorizationServiceStub = Layer.succeed(
  AuthorizationService,
  AuthorizationService.of({
    require: () => Effect.void,
    requireRelation: () => Effect.void,
  })
)
```

### `rbac-engine/src/domain/app-context.ts`

```typescript
import { Layer } from 'effect'
import { IamAdapter } from './iam/iam-adapter.js'
import { OidcIamAdapterLayer } from './iam/oidc-iam-adapter.js'
import { AuthorizationServiceLive } from './authorization/authorization-service.js'
import { AppAuditWriterLive } from './audit/app-audit-writer-service.js'

export const AppLayer = Layer.mergeAll(
  process.env.IAM_MODE === 'stub' ? StubIamAdapterLayer : OidcIamAdapterLayer,
  AuthorizationServiceLive,
  AppAuditWriterLive
)
```

### `rbac-engine/src/domain/run-effect.ts`

```typescript
import { Effect, Layer, ManagedRuntime } from 'effect'
import { AppLayer } from './app-context.js'
import {
  AccessDeniedError,
  ClaimsValidationError,
  RelationViolationError,
} from '@achs/rbac-contracts'
import { AuthenticationError } from './iam/iam-adapter.js'

const runtime = ManagedRuntime.make(AppLayer)

export const runEffect = <A>(
  effect: Effect.Effect<
    A,
    AccessDeniedError | RelationViolationError | AuthenticationError | ClaimsValidationError
  >
): Promise<A> => runtime.runPromise(effect)
```

### `rbac-engine/app/middleware/auth-middleware.ts`

```typescript
import { Effect, Exit } from 'effect'
import { IamAdapter } from '../../src/domain/iam/iam-adapter.js'
import { buildAccessContext } from '../../src/domain/access-context/access-context-builder.js'

export class AuthMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const token = this.extractToken(ctx)
    if (!token) return ctx.response.status(401).json({ error: 'No autorizado' })

    const runtime = await getRuntime()
    const exit = await runtime.runPromiseExit(
      IamAdapter.pipe(
        Effect.flatMap((iam) => iam.authenticate(token)),
        Effect.flatMap(buildAccessContext)
      )
    )

    if (Exit.isFailure(exit)) {
      return ctx.response.status(401).json({ error: 'No autorizado' })
    }

    ctx.accessContext = exit.value
    await next()
  }
}
```

### `rbac-engine/app/controllers/prestacion-controller.ts`

```typescript
import { Effect } from 'effect'
import { AuthorizationService } from '@achs/rbac-contracts'
import { runEffect } from '../../src/domain/run-effect.js'

export default class PrestacionController {
  async otorgar({ request, accessContext, response }: HttpContext) {
    const ctx = accessContext as AccessContext
    const cmd = request.body() as OtorgarPrestacionCmd

    try {
      await runEffect(
        Effect.gen(function* () {
          const auth = yield* AuthorizationService
          yield* auth.require(ctx, 'prestacion:otorgar')
          yield* auth.requireRelation(ctx, 'prestacion:otorgar', cmd.hechoCausalId)
        })
      )
    } catch (err) {
      if (err instanceof AccessDeniedError || err instanceof RelationViolationError) {
        return response.status(403).json({ error: err.message })
      }
      throw err
    }

    // lógica de dominio...
  }
}
```

---

## Scaffolding B — TypeScript puro

### `rbac-contracts/package.json`

```json
{
  "name": "@achs/rbac-contracts",
  "version": "1.0.0",
  "type": "module",
  "exports": { ".": "./dist/index.js" }
}
```

> Sin dependencias de runtime. Solo TypeScript como devDependency.

### `rbac-contracts/src/errors.ts`

```typescript
export class AuthenticationError extends Error {
  readonly _tag = 'AuthenticationError' as const
  constructor(
    readonly reason: 'invalid_token' | 'expired' | 'issuer_mismatch',
    message: string
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class ClaimsValidationError extends Error {
  readonly _tag = 'ClaimsValidationError' as const
  constructor(
    readonly missing: ReadonlyArray<string>,
    readonly subjectKind: 'human' | 'agent' | 'external'
  ) {
    super(`Missing claims [${missing.join(', ')}] for ${subjectKind}`)
    this.name = 'ClaimsValidationError'
  }
}

export class AccessDeniedError extends Error {
  readonly _tag = 'AccessDeniedError' as const
  constructor(
    readonly capability: string,
    readonly subjectKind: string,
    readonly denialReason: string
  ) {
    super(`Capability '${capability}' denied for ${subjectKind}: ${denialReason}`)
    this.name = 'AccessDeniedError'
  }
}

export class RelationViolationError extends Error {
  readonly _tag = 'RelationViolationError' as const
  constructor(
    readonly capability: string,
    readonly resourceId: string
  ) {
    super(`Relation check failed: '${capability}' on resource '${resourceId}'`)
    this.name = 'RelationViolationError'
  }
}

// type guard — útil en catch blocks
export type DomainError =
  AuthenticationError | ClaimsValidationError | AccessDeniedError | RelationViolationError

export function isDomainError(err: unknown): err is DomainError {
  return (
    err instanceof AuthenticationError ||
    err instanceof ClaimsValidationError ||
    err instanceof AccessDeniedError ||
    err instanceof RelationViolationError
  )
}
```

### `rbac-contracts/src/authorization.ts`

```typescript
import type { AccessContext } from './access-context.js'
import type { Capability } from './capability.js'

// Las implementaciones lanzan AccessDeniedError / RelationViolationError
export interface AuthorizationService {
  /** @throws {AccessDeniedError} */
  require(ctx: AccessContext, capability: Capability): void

  /** @throws {AccessDeniedError} @throws {RelationViolationError} */
  requireRelation(ctx: AccessContext, capability: Capability, resourceId: string): void
}
```

### `rbac-engine/src/domain/iam/iam-adapter.ts`

```typescript
import type { TokenClaims } from './token-claims.js'

// Las implementaciones lanzan AuthenticationError
export interface IamAdapter {
  /** @throws {AuthenticationError} */
  authenticate(token: string): Promise<TokenClaims>
}
```

### `rbac-engine/src/domain/iam/stub-iam-adapter.ts`

```typescript
import type { IamAdapter } from './iam-adapter.js'
import type { TokenClaims } from './token-claims.js'

export class StubIamAdapter implements IamAdapter {
  constructor(private readonly fixture: TokenClaims) {}

  async authenticate(_token: string): Promise<TokenClaims> {
    return this.fixture
  }
}
```

### `rbac-engine/src/domain/access-context/access-context-builder.ts`

```typescript
import { ClaimsValidationError } from '@achs/rbac-contracts'
import type { TokenClaims } from '../iam/token-claims.js'
import type { AccessContext, Subject } from '@achs/rbac-contracts'
import { mapGroupsToRoles } from './capability-map.js'
import { buildRelationContext } from './relation-context-builder.js'
import { findAgentRegistration } from '../registry/agent-registry-lookup.js'

/** @throws {ClaimsValidationError} */
export function buildAccessContext(claims: TokenClaims): AccessContext {
  const subject = claimsToSubject(claims)
  return {
    subject,
    capabilities: getCapabilities(subject, claims),
    relations: buildRelationContext(subject),
    requestId: claims.jti ?? crypto.randomUUID(),
    issuedAt: new Date(),
  }
}

/** @throws {ClaimsValidationError} */
function claimsToSubject(claims: TokenClaims): Subject {
  if (claims.externalType) {
    if (!claims.sub) throw new ClaimsValidationError(['sub'], 'external')
    return {
      kind: 'external',
      externalId: claims.sub,
      externalType: claims.externalType,
      authenticatedVia: 'api_key',
    }
  }

  if (claims.oid && claims.email) {
    if (!claims.extension_orgUnit) throw new ClaimsValidationError(['extension_orgUnit'], 'human')
    return {
      kind: 'human',
      userId: claims.oid,
      email: claims.email,
      businessRoles: mapGroupsToRoles(claims.groups ?? []),
      orgUnit: claims.extension_orgUnit,
      authenticatedVia: 'sso',
    }
  }

  const agentId = claims.appId ?? claims.azp
  const missing: string[] = []
  if (!agentId) missing.push('appId|azp')
  if (!claims.environment) missing.push('environment')
  if (missing.length > 0) throw new ClaimsValidationError(missing, 'agent')

  const registration = findAgentRegistration(agentId!)
  return {
    kind: 'agent',
    agentId: agentId!,
    agentType: registration?.agentType ?? 'ExternalSystem',
    operationScope: {
      operation: registration?.operation ?? 'unregistered',
      environment: claims.environment!,
    },
    invokedBy: claims.invokedBy,
    environment: claims.environment!,
  }
}
```

### `rbac-engine/src/domain/authorization/authorization-service.ts`

```typescript
import { AccessDeniedError, RelationViolationError } from '@achs/rbac-contracts'
import type { AuthorizationService, AccessContext, Capability } from '@achs/rbac-contracts'
import { checkRelation } from './relation-checker.js'

export class AuthorizationServiceImpl implements AuthorizationService {
  /** @throws {AccessDeniedError} */
  require(ctx: AccessContext, capability: Capability): void {
    if (!ctx.capabilities.has(capability)) {
      throw new AccessDeniedError(capability, ctx.subject.kind, 'capability not in set')
    }
  }

  /** @throws {AccessDeniedError} @throws {RelationViolationError} */
  requireRelation(ctx: AccessContext, capability: Capability, resourceId: string): void {
    this.require(ctx, capability)
    if (!checkRelation(ctx, resourceId)) {
      throw new RelationViolationError(capability, resourceId)
    }
  }
}

export class AuthorizationServiceStub implements AuthorizationService {
  require(_ctx: AccessContext, _cap: Capability): void {}
  requireRelation(_ctx: AccessContext, _cap: Capability, _resourceId: string): void {}
}
```

### `rbac-engine/src/domain/app-context.ts`

```typescript
import { OidcIamAdapter } from './iam/oidc-iam-adapter.js'
import { StubIamAdapter } from './iam/stub-iam-adapter.js'
import { AuthorizationServiceImpl } from './authorization/authorization-service.js'
import { AppAuditWriterService } from './audit/app-audit-writer-service.js'
import { TokenClaimsFixture } from './iam/token-claims-fixture.js'

const iam =
  process.env.IAM_MODE === 'stub'
    ? new StubIamAdapter(TokenClaimsFixture.analista)
    : new OidcIamAdapter({ issuer: process.env.OIDC_ISSUER! })

const authz = new AuthorizationServiceImpl()
const audit = new AppAuditWriterService()

// inyección manual — un objeto simple en lugar de AppLayer
export const container = { iam, authz, audit }
```

### `rbac-engine/app/middleware/auth-middleware.ts`

```typescript
import type { IamAdapter } from '../../src/domain/iam/iam-adapter.js'
import { buildAccessContext } from '../../src/domain/access-context/access-context-builder.js'
import { AuthenticationError, ClaimsValidationError } from '@achs/rbac-contracts'

export class AuthMiddleware {
  constructor(private readonly iam: IamAdapter) {}

  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const token = this.extractToken(ctx)
    if (!token) return ctx.response.status(401).json({ error: 'No autorizado' })

    try {
      const claims = await this.iam.authenticate(token)
      ctx.accessContext = buildAccessContext(claims)
    } catch (err) {
      if (err instanceof AuthenticationError || err instanceof ClaimsValidationError) {
        return ctx.response.status(401).json({ error: 'No autorizado' })
      }
      throw err
    }

    await next()
  }

  private extractToken(ctx: HttpContext): string | null {
    const header = ctx.request.header('Authorization')
    if (!header) return null
    const [scheme, token] = header.split(' ')
    return scheme === 'Bearer' ? (token ?? null) : null
  }
}
```

### `rbac-engine/app/controllers/prestacion-controller.ts`

```typescript
import type { AuthorizationService } from '@achs/rbac-contracts'
import { AccessDeniedError, RelationViolationError } from '@achs/rbac-contracts'

export default class PrestacionController {
  constructor(private readonly authz: AuthorizationService) {}

  async otorgar({ request, accessContext, response }: HttpContext) {
    const ctx = accessContext as AccessContext
    const cmd = request.body() as OtorgarPrestacionCmd

    try {
      this.authz.require(ctx, 'prestacion:otorgar')
      this.authz.requireRelation(ctx, 'prestacion:otorgar', cmd.hechoCausalId)
    } catch (err) {
      if (err instanceof AccessDeniedError || err instanceof RelationViolationError) {
        return response.status(403).json({ error: err.message })
      }
      throw err
    }

    // lógica de dominio...
  }
}
```

---

## Tabla de decisión

| Criterio                       | Effect-TS                          | TypeScript puro                 | Peso   |
| ------------------------------ | ---------------------------------- | ------------------------------- | ------ |
| Errores visibles en tipos      | ✅ El compilador fuerza el manejo  | ⚠️ Solo JSDoc + runtime         | Alto   |
| Dependencias en rbac-contracts | ❌ `effect` (~500KB)               | ✅ Cero                         | Alto   |
| Legibilidad para el equipo     | ⚠️ Requiere conocer Effect         | ✅ `async/await` estándar       | Alto   |
| DI tipada y verificada         | ✅ `Layer` falla en compilación    | ⚠️ Manual, falla en runtime     | Medio  |
| Retry / resiliencia futura     | ✅ Un `pipe` adicional             | ⚠️ Código extra o dependencia   | Medio  |
| Tamaño del bundle final        | ❌ Mayor                           | ✅ Mínimo                       | Medio  |
| Velocidad de onboarding        | ❌ 1-2 semanas para ser productivo | ✅ Inmediato                    | Alto   |
| Testabilidad                   | ✅ Layer swap trivial              | ✅ Constructor injection simple | Empate |
| Stack traces en producción     | ⚠️ Muestra internos de Effect      | ✅ Directo al código de app     | Medio  |

### Recomendación

**Usa TypeScript puro si:**

- El equipo no tiene experiencia previa con Effect
- El paquete `rbac-contracts` debe ser liviano (SPA + pec-engine lo consumen)
- La lógica de autorización es lineal y no necesita retry/concurrencia

**Usa Effect si:**

- El equipo ya usa Effect en `pec-engine` y hay consistencia ganada
- Se anticipa que `IamAdapter` necesitará retry, circuit breaker o timeout en el futuro cercano
- Se valora más la seguridad de tipos en errores que el tamaño del bundle

---

## Referencias

- ADR-001: Entra ID como IAM
- ADR-004: Middleware pipeline
- ADR-005: Mapeo de claims
- ADR-009: Scaffolding completo del motor RBAC
