import type { TokenClaims } from './token-claims.js'

/**
 * Frontera con Entra ID. Valida el token y retorna claims normalizados.
 * Ver ADR-001 para la decisión de adoptar openid-client.
 * Ver ADR-005 para la cadena claims → Subject → AccessContext.
 */
export interface IamAdapter {
  /**
   * Valida el token (JWT real o token stub) y retorna claims normalizados.
   * @throws {AuthenticationError} token inválido, expirado, ausente o claims incompletos
   */
  authenticate(token: string): Promise<TokenClaims>
}

export class AuthenticationError extends Error {
  readonly code = 'unauthenticated' as const

  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}
