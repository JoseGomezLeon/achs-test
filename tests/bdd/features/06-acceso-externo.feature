# ADR-011 §2.4 — Sujetos externos (ExternalSubject)
# Los externos sólo tienen capacidades del externalCapabilityMap
# No pueden ejercer capacidades del humanCapabilityMap

Feature: Acceso de sujetos externos
  Como motor de autorización RBAC
  Quiero que los empleadores sólo accedan a capacidades externas definidas
  Para que nunca puedan ejercer operaciones internas de ACHS

  Background:
    Given el sistema opera en modo TEST_MODE=architecture

  # ── Capacidades permitidas ──────────────────────────────────────────────────

  @smoke @rbac
  Scenario: Empleador puede consultar estado de hecho causal
    Given un sujeto autenticado con token "external-empleador"
    When intenta ejecutar la capacidad "hecho-causal:consultar-estado"
    Then el acceso es concedido

  @smoke @rbac
  Scenario: Empleador no puede otorgar prestaciones (capacidad interna)
    Given un sujeto autenticado con token "external-empleador"
    When intenta ejecutar la capacidad "prestacion:otorgar"
    Then el acceso es denegado con código "access_denied"

  # ── Aislamiento de dominio externo ──────────────────────────────────────────

  @rbac
  Scenario Outline: Empleador no tiene acceso a capacidades internas
    Given un sujeto autenticado con token "external-empleador"
    When intenta ejecutar la capacidad "<capacidad>"
    Then el acceso es denegado con código "access_denied"

    Examples:
      | capacidad                      |
      | prestacion:otorgar             |
      | prestacion:denegar             |
      | prestacion:consultar           |
      | liquidacion:solicitar-cierre   |
      | liquidacion:aprobar-cierre     |
      | liquidacion:calcular           |
      | liquidacion:ejecutar-cierre    |
      | liquidacion:consultar          |
      | auditoria:leer                 |
      | rbac:administrar               |
      | agente:gestionar-sesion-dev    |

  @rbac
  Scenario: Sujeto externo queda registrado en auditoría con actorKind "external"
    Given un sujeto autenticado con token "external-empleador"
    When intenta ejecutar la capacidad "hecho-causal:consultar-estado"
    Then el acceso es concedido
    And queda registro de auditoría con actorKind "external"
