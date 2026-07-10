/**
 * Claims extraídos de un JWT de Entra ID (humanos y agentes).
 * Tipo interno de rbac — no se expone como contrato público.
 * Ver ADR-001, ADR-005 para la semántica de cada claim.
 */
export type TokenClaims = {
  // Humanos: OIDC Authorization Code + PKCE
  readonly oid?: string // HumanSubject.userId
  readonly email?: string
  readonly groups?: readonly string[] // grupo Entra ID → BusinessRole
  readonly extension_orgUnit?: string // claim custom de ACHS

  // Agentes: Client Credentials
  readonly appId?: string // App Registration clientId
  readonly azp?: string // alternativa a appId
  readonly roles?: readonly string[] // grants externos — se intersectan con AgentRegistry
  readonly environment?: string // 'dev' | 'staging' | 'prod'

  // Stub-only: indica sujeto externo (empleador) cuando no hay flujo OIDC real
  readonly achs_subject_kind?: 'external'
  readonly achs_external_type?: string

  // Claims estándar JWT
  readonly sub?: string
  readonly exp?: number
  readonly iss?: string
  readonly aud?: string | readonly string[]
  readonly jti?: string
}
