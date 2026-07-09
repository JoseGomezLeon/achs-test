# ADR-001 — IAM: Microsoft Entra ID como Identity Provider

**Estado:** Aceptada

## Contexto

El motor de cálculo PEC2 necesita autenticar usuarios humanos y agentes batch con un IAM corporativo. El modelo RBAC (documentado en `rbac_humano_agente.md`) requiere que los sujetos se identifiquen con claims específicos:

- **Humanos:** `userId`, `email`, `businessRoles` (uno o más, desde `groups`), `orgUnit` (obligatorio)
- **Agentes:** `agentId`, `environment` (obligatorio); `agentType` y `operation` los fija el `AgentRegistry`, no el token

La ACHS usa Microsoft Entra ID (Azure AD) como IAM corporativo. Cualquier solución de autenticación debe integrarse con este proveedor para producción.

## Decisión

Se adopta **Microsoft Entra ID** (Azure AD) como Identity Provider único.

La integracion con AdonisJS se hara por **OpenID Connect estandar**, no mediante un provider social especifico de AdonisJS. `@adonisjs/ally` queda descartado para este caso porque sus providers oficiales cubren redes/plataformas sociales comunes, pero no Microsoft Entra ID como provider corporativo. `@adonisjs/auth` se usa para la sesion/app user cuando aplique; la validacion de tokens OIDC queda encapsulada en un `IamAdapter` implementado con `openid-client`.

```typescript
// app/modules/rbac/domain/iam/iam-adapter.ts
export interface IamAdapter {
  /** @throws {AuthenticationError} si el token es inválido, expiró o es desconocido (stub). */
  authenticate(token: string): Promise<TokenClaims>
}
```

Para agentes por Client Credentials el token resultante entra por el mismo `authenticate`; no hay un método aparte — el flujo de obtención del token es responsabilidad del cliente (job/worker), no del adapter.

Implementaciones previstas:

| Adapter | Uso | Fuente de claims |
|---|---|---|
| `OidcIamAdapter` | Produccion e integracion | Entra ID o mock OIDC via discovery/JWKS |
| `StubIamAdapter` | Unit tests y desarrollo rapido | Fixture in-memory deterministico |

### Flujo para humanos

- Protocolo: OpenID Connect sobre OAuth 2.0 Authorization Code + PKCE
- El flujo lo ejecuta **el servidor Adonis** (patrón BFF, decidido en skeleton-rbac-front ADR-001): el navegador solo pasa por los redirects de login y mantiene una cookie de sesión `httpOnly`; los tokens se guardan en sesión server-side y **nunca llegan al navegador**. No se usa MSAL.
- Middleware AdonisJS obtiene la credencial (Bearer para agentes/jobs, sesión para humanos — ver ADR-004) y la valida con `OidcIamAdapter`
- Claims extraidos del token validado se mapean a `Subject`

### Flujo para agentes batch

- Protocolo: OAuth 2.0 Client Credentials
- Cada job tiene su propia App Registration en Entra ID
- El `appId`/`azp` identifica la App Registration que pidio el token
- El `oid` identifica el Service Principal dentro del tenant, cuando el claim este disponible
- Los `roles` de la app son grants externos, no la autoridad final de permisos
- El `AgentRegistry` local traduce App Registration/Service Principal a agente logico, operacion, ambiente y capacidades maximas

La capacidad efectiva de un agente es la interseccion entre lo que declara Entra ID y lo que permite el `AgentRegistry` versionado:

```text
effectiveCapabilities = token.roles ∩ AgentRegistry.allowedCapabilities
```

Si el agente no existe en `AgentRegistry`, queda sin capacidades aunque el token sea valido.

Ejemplo:

```typescript
{
  logicalAgentId: "pec2-job-pdn-pag-001",
  entraClientId: "1111-2222-3333",
  entraObjectId: "aaaa-bbbb-cccc",
  agentType: "BatchJob",
  operation: "PDN-PAG-001",
  environment: "prod",
  allowedCapabilities: [
    "job:ejecutar-ciclo-pago",
    "liquidacion:calcular",
    "liquidacion:consultar",
    "liquidacion:generar-archivos",
    "calculo:ejecutar",
    "marco:resolver",
    "incidente:crear-automatico"
  ]
}
```

### Claims requeridos en Entra ID

| Claim | Origen | Uso |
|---|---|---|
| `oid` | Entra ID (built-in) | `HumanSubject.userId` |
| `email` | Entra ID (built-in) | `HumanSubject.email` |
| `groups` | Entra ID (requiere Azure AD Premium P1) | Mapeo → `BusinessRole` |
| `extension_orgUnit` | Custom extension attribute | `HumanSubject.orgUnit` |
| `appId` / `azp` | Entra ID (built-in) | `AgentSubject.agentId` |
| `oid` | Entra ID (built-in) | Service Principal ID para auditoria y registry |
| `roles` | Entra ID App Roles | Grants externos que se intersectan con `AgentRegistry` |

### Configuracion OIDC

El adapter no hardcodea endpoints. Lee el discovery document del issuer configurado:

```text
https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration
```

Validaciones minimas:

- Firma JWT contra JWKS del issuer
- `iss` igual al issuer configurado
- `aud` igual al client/application ID esperado
- `exp`, `nbf` y clock skew acotado
- `nonce`/`state` en flujos interactivos, cuando el adapter participe del callback

### Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| Auth0 / Okta | No es el IAM corporativo de ACHS; requeriría sincronización de usuarios |
| JWT propio firmado | Sin infraestructura de PKI; Entra ID ya lo resuelve |
| LDAP on-prem | ACHS está migrando a cloud; no se justifica inversión en legacy |
| `@adonisjs/ally` | Es social auth y no provee un provider oficial Microsoft/Entra ID para este flujo corporativo |
| Implementacion manual de OIDC con `fetch` | Aumenta superficie de error en validacion de tokens, JWKS, issuer, audience y rotacion de llaves |

## Consecuencias

- **Positivas:** single source of truth para identidad. Roles y grupos se administran en Entra ID, no en el código.
- **Positivas:** OIDC evita acoplar el dominio RBAC a una libreria especifica; el mismo adapter sirve contra Entra ID real y un mock OIDC local.
- **Negativas:** los `groups` en el JWT requieren Azure AD Premium P1 (no incluido en Free). Si ACHS no tiene P1, los grupos no aparecen en el token — hay que consultarlos vía Microsoft Graph API como fallback.
- **Negativas:** el atributo `extension_orgUnit` requiere configuración adicional en Entra ID (schema extension). Si no está disponible, se usará un mock para dev y se diferirá la integración real hasta que IT lo configure.

## Referencias

- `rbac_humano_agente.md` secciones 2, 3, 7, 8
- `#rbac/contracts` — tipos de Subject, Capability, AccessContext (ver ADR-010)
- [Microsoft Entra ID documentation](https://learn.microsoft.com/en-us/entra/identity/)
- [Microsoft identity platform OIDC](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [@adonisjs/auth](https://github.com/adonisjs/auth)
- [openid-client](https://github.com/panva/openid-client)
