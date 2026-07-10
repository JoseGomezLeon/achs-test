# ADR-011 §1 — Sistemas externos y stubs
# ADR-011 §3.5 — Contratos de error: unauthenticated (401)
# Flujo crítico @smoke: sin autenticación válida no hay AccessContext

Feature: Autenticación de sujetos RBAC
  Como motor de autorización RBAC
  Quiero validar el token antes de construir el AccessContext
  Para que sólo sujetos identificados accedan al dominio

  Background:
    Given el sistema opera en modo TEST_MODE=architecture

  @smoke @rbac
  Scenario: Token válido de analista genera sujeto humano autenticado
    Given un token "analista-rm-norte"
    When el sistema autentica el token
    Then el sujeto es de tipo HumanSubject
    And el sujeto tiene rol "analista"
    And el sujeto tiene orgUnit "RM-Norte"

  @smoke @rbac
  Scenario: Token válido de job batch genera sujeto agente autenticado
    Given un token "job-pdn-pag-001"
    When el sistema autentica el token
    Then el sujeto es de tipo AgentSubject
    And el agente tiene operation "PDN-PAG-001"

  @smoke @rbac
  Scenario: Token desconocido produce error de autenticación
    Given un token "unknown"
    When el sistema autentica el token
    Then el resultado es un error con código "unauthenticated"
    And el código HTTP asociado es 401

  @rbac
  Scenario: Token de sujeto externo genera ExternalSubject
    Given un token "external-empleador"
    When el sistema autentica el token
    Then el sujeto es de tipo ExternalSubject
    And el sujeto tiene tipo externo "empleador"

  @rbac
  Scenario Outline: Todos los tokens stub producen sujetos válidos
    Given un token "<token>"
    When el sistema autentica el token
    Then la autenticación es exitosa

    Examples:
      | token               |
      | analista-rm-norte   |
      | analista-rm-sur     |
      | supervisor-full     |
      | operador-pagos      |
      | auditor             |
      | admin-gobernanza    |
      | job-pdn-pag-001     |
      | agent-afk-ts06      |
      | external-empleador  |
