# ADR-003 — Consumo de @achs/pec-contracts como contrato de dominio

**Estado:** Reemplazada por ADR-010

> Con el pivote a monolito modular (ADR-010) ya no existe un paquete de contratos externo: los tipos de dominio viven en `app/modules/rbac/contracts/` y se consumen vía el import alias `#rbac/contracts`. Se conserva este ADR como registro histórico.

## Contexto

El proyecto `skeleton-rbac` implementa el sistema de autorización para PEC2. Los tipos de dominio (`Subject`, `Capability`, `AccessContext`, `BusinessRole`, etc.) y el Effect Tag `AuthorizationService` ya están definidos en el paquete `@achs/pec-contracts` (parte del monorepo `skeleton-pec`).

Se necesita decidir si el `skeleton-rbac` re-define estos tipos (duplicación) o los consume del paquete de contratos (dependencia externa).

## Decisión

`skeleton-rbac` **consume** `@achs/pec-contracts` como dependencia. No duplica tipos.

### Reglas del límite

1. `skeleton-rbac` importa tipos y Tags **solo** de `@achs/pec-contracts/auth` y `@achs/pec-contracts` (raíz).
2. `skeleton-rbac` **implementa** el `AuthorizationService` Tag. No define nuevos Tags de dominio.
3. `skeleton-rbac` puede definir sus propios tipos internos (`IamAdapter`, `TokenClaims`, `AuthenticationError`) que son específicos de su responsabilidad de infraestructura, no de dominio.
4. `skeleton-rbac` **nunca** modifica los tipos de `@achs/pec-contracts`. Si necesita una extensión, se propone como cambio en el paquete de contratos.

### Estructura de imports

```typescript
// skeleton-rbac/src/service/authorization-service.ts
import { Effect, Layer } from 'effect'
import {
  AuthorizationService,
  AccessDeniedError,
  RelationViolationError,
  Capability,
  AccessContext,
} from '@achs/pec-contracts/auth'

// Implementación del Tag
export const AuthorizationServiceReal = Layer.effect(
  AuthorizationService,
  Effect.gen(function* () {
    // acceso al AccessContext desde el scope de la request
    // ...
  })
)
```

### Qué tipos son de dominio (contracts) vs locales (rbac)

| Tipo                                                         | Origen                  | Razón                                                              |
| ------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------ |
| `Subject`, `HumanSubject`, `AgentSubject`, `ExternalSubject` | `@achs/pec-contracts`   | Tipos de dominio del RBAC                                          |
| `Capability`                                                 | `@achs/pec-contracts`   | Verbo de dominio                                                   |
| `AccessContext`                                              | `@achs/pec-contracts`   | Contexto de autorización unificado                                 |
| `AuthorizationService` (Tag)                                 | `@achs/pec-contracts`   | Contrato del servicio                                              |
| `AccessDeniedError`, `RelationViolationError`                | `@achs/pec-contracts`   | Errores de dominio                                                 |
| `IamAdapter`                                                 | `skeleton-rbac` (local) | Detalle de infraestructura (cómo se autentica, no qué se autoriza) |
| `TokenClaims`                                                | `skeleton-rbac` (local) | Representación intermedia de claims de JWT                         |
| `AuthenticationError`                                        | `skeleton-rbac` (local) | Error de infraestructura (token inválido, no error de dominio)     |

## Alternativas consideradas

| Alternativa                         | Descartada porque                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Duplicar tipos en skeleton-rbac     | Si cambia el contrato, hay que actualizar dos lugares. Inconsistencia garantizada.                   |
| Mover los contratos a skeleton-rbac | Los contratos son usados por el engine también. El package compartido es el punto único de verdad.   |
| Usar imports relativos al monorepo  | `@achs/pec-contracts` ya está configurado como workspace npm. Usar el alias es la práctica estándar. |

## Consecuencias

- **Positivas:** single source of truth. Si el `Capability` cambia, ambos paquetes lo reflejan automáticamente.
- **Positivas:** los tests de skeleton-rbac pueden importar los mismos tipos que usa el engine — garantía de compatibilidad.
- **Negativas:** `skeleton-rbac` tiene una dependencia externa que debe estar instalada. En el contexto del monorepo esto es trivial; fuera del monorepo requeriría publicar `@achs/pec-contracts` a un registry.
- **Negativas:** si el paquete de contratos crece, skeleton-rbac hereda todo el árbol de tipos aunque solo use `auth`.

## Referencias

- `skeleton-pec/packages/contracts/src/auth/index.ts`
- ADR-008 del skeleton-pec (monorepo contracts↔engine)
- `rbac_humano_agente.md` sección 6 (uso en Effect-TS)
