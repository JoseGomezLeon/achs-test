# ADR-002 — Estrategia de Mock para Desarrollo y Tests

**Estado:** Aceptada

## Contexto

El motor de autorización (`skeleton-rbac`) depende de Entra ID (ADR-001) para validar tokens y extraer claims. Durante el desarrollo local y los tests automatizados no hay conectividad con Entra ID — ni debería haberla, porque los tests deben ser determinísticos y rápidos.

Se necesita un mecanismo que permita desarrollar y testear el flujo completo de autorización **sin depender de infraestructura externa**, pero sin crear un bypass que haga los tests irrelevantes para producción.

## Decisión

Se implementan dos niveles de mock, ambos detras de la misma interfaz `IamAdapter` definida en ADR-001:

1. `StubIamAdapter`: unit tests y desarrollo rapido sin criptografia ni red.
2. `OidcIamAdapter` contra un issuer local: pruebas de integracion del flujo real OIDC, incluyendo discovery y JWKS.

### 2.1. StubIamAdapter

Implementa la interfaz `IamAdapter` con fixtures locales en lugar de JWTs reales. Los fixtures replican la forma exacta de los claims de Entra ID (`oid`, `tid`, `iss`, `aud`, `roles`, `extension_orgUnit`, ...) para que el cambio a `OidcIamAdapter` solo altere issuer y firma, no la estructura.

```typescript
// app/modules/rbac/domain/iam/stub-iam-adapter.ts
export class StubIamAdapter implements IamAdapter {
  async authenticate(token: string): Promise<TokenClaims> {
    const claims = TokenClaimsFixture[token]
    if (!claims) {
      throw new AuthenticationError("unknown_token", `Unknown stub token: '${token}'`)
    }
    return claims
  }
}
```

### 2.2. OIDC mock local

Para pruebas de integracion se levanta un proveedor OIDC local compatible con discovery/JWKS. Opciones aceptadas:

| Opcion | Uso recomendado |
|---|---|
| `mock-oauth2-server` | Docker Compose simple para CI/local |
| `oidc-provider` | Simulacion mas completa de OIDC, JWKS y tokens firmados |

El `OidcIamAdapter` no sabe si el issuer es Entra ID real o mock. Solo recibe configuracion:

```text
OIDC_ISSUER=http://localhost:8080/default
OIDC_CLIENT_ID=pec2-rbac-local
OIDC_AUDIENCE=pec2-api
```

### 2.3. TokenClaimsFixture (función pura)

Mapea un string plano a `TokenClaims` segun convenciones predefinidas. El camino completo sigue siendo `Claims -> Subject -> AccessContext`, igual que produccion.

| Formato del token | Claims resultantes |
|---|---|
| `<rol>-<orgUnit>` | `oid`, `email`, `groups`, `extension_orgUnit` |
| `job-<nombre>` | `appId`, `azp`, `roles`, `environment` |
| `agent-afk-<ts>` | `appId`, `roles`, `operationScope`, `environment=dev` |
| `agente-hitl-<op>` | `appId`, `roles`, `invokedBy` |
| `externo-<tipo>` | `sub`, `externalType` |

### 2.4. CapabilitySet en memoria

Las matrices de mapeo (`BusinessRole → CapabilitySet` y `AgentType → CapabilitySet`) están hardcodeadas como `Map` inmutables, sincronizadas con el documento `rbac_humano_agente.md`.

### 2.5. Condición de uso

El stub **solo se activa** cuando `NODE_ENV !== 'production'` y `IAM_MODE=stub`. En produccion, el `OidcIamAdapter` contra Entra ID real es el unico provider disponible. La seleccion vive en la composicion del container (DI manual, ver ADR-010):

```typescript
// app/modules/rbac/domain/container.ts
const iam: IamAdapter =
  process.env.NODE_ENV !== "production" && process.env.IAM_MODE === "stub"
    ? new StubIamAdapter()
    : new OidcIamAdapter(oidcConfig)

export const container = { iam, authz: new AuthorizationServiceImpl(audit), audit }
```

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| MSAL mock oficial | Acopla los tests a MSAL; el contrato que importa para RBAC son claims OIDC normalizados. |
| Bypass directo (AllowAll) | Los tests del bypass no verifican la lógica real del mapeo de roles. Inseguro. |
| Solo tokens planos en dev | Rapido para unit tests, pero no prueba discovery/JWKS ni validacion JWT. Se complementa con mock OIDC. |

## Consecuencias

- **Positivas:** los tests son determinísticos, rápidos y no necesitan red.
- **Positivas:** cualquier developer puede testear rapido con `IAM_MODE=stub` o probar el flujo OIDC real contra un issuer local.
- **Positivas:** el deny-by-default se testea fácilmente pasando un token no reconocido.
- **Negativas:** los fixtures de claims pueden divergir de Entra ID. Deben cubrirse con tests del `claimsToSubject` y una suite de integracion contra mock OIDC.
- **Negativas:** el mock OIDC agrega un servicio mas al entorno local/CI.

## Referencias

- ADR-001: Entra ID como IAM
- `rbac_humano_agente.md` secciones 3.2 y 3.3 (matrices de capacidades)
- `#rbac/contracts` — tipos de Subject, Capability (ver ADR-010)
- [mock-oauth2-server](https://github.com/navikt/mock-oauth2-server)
- [oidc-provider](https://github.com/panva/node-oidc-provider)
