# ADR-011 §2.2 — Matriz BusinessRole → CapabilitySet
# Cada fila de la matriz es un escenario verificable

Feature: Matriz de capacidades por rol humano
  Como motor de autorización RBAC
  Quiero que cada rol tenga exactamente las capacidades definidas en el ADR
  Para garantizar que ningún rol tenga más ni menos acceso del diseñado

  Background:
    Given el sistema opera en modo TEST_MODE=architecture

  # ── Analista ────────────────────────────────────────────────────────────────

  @smoke @rbac
  Scenario: Analista puede otorgar prestaciones
    Given un sujeto autenticado con token "analista-rm-norte"
    When intenta ejecutar la capacidad "prestacion:otorgar"
    Then el acceso es concedido

  @rbac
  Scenario: Analista puede denegar prestaciones
    Given un sujeto autenticado con token "analista-rm-norte"
    When intenta ejecutar la capacidad "prestacion:denegar"
    Then el acceso es concedido

  @rbac
  Scenario: Analista puede consultar prestaciones
    Given un sujeto autenticado con token "analista-rm-norte"
    When intenta ejecutar la capacidad "prestacion:consultar"
    Then el acceso es concedido

  @rbac
  Scenario: Analista no puede aprobar cierre mensual
    Given un sujeto autenticado con token "analista-rm-norte"
    When intenta ejecutar la capacidad "liquidacion:aprobar-cierre"
    Then el acceso es denegado con código "access_denied"

  @rbac
  Scenario: Analista no puede solicitar cierre mensual
    Given un sujeto autenticado con token "analista-rm-norte"
    When intenta ejecutar la capacidad "liquidacion:solicitar-cierre"
    Then el acceso es denegado con código "access_denied"

  @rbac
  Scenario: Analista no puede calcular liquidaciones
    Given un sujeto autenticado con token "analista-rm-norte"
    When intenta ejecutar la capacidad "liquidacion:calcular"
    Then el acceso es denegado con código "access_denied"

  # ── Supervisor ──────────────────────────────────────────────────────────────

  @smoke @rbac
  Scenario: Supervisor puede aprobar cierre mensual
    Given un sujeto autenticado con token "supervisor-full"
    When intenta ejecutar la capacidad "liquidacion:aprobar-cierre"
    Then el acceso es concedido

  @rbac
  Scenario: Supervisor puede consultar liquidaciones
    Given un sujeto autenticado con token "supervisor-full"
    When intenta ejecutar la capacidad "liquidacion:consultar"
    Then el acceso es concedido

  @rbac
  Scenario: Supervisor no puede solicitar cierre (eso es del operador)
    Given un sujeto autenticado con token "supervisor-full"
    When intenta ejecutar la capacidad "liquidacion:solicitar-cierre"
    Then el acceso es denegado con código "access_denied"

  @rbac
  Scenario: Supervisor no puede calcular liquidaciones directamente
    Given un sujeto autenticado con token "supervisor-full"
    When intenta ejecutar la capacidad "liquidacion:calcular"
    Then el acceso es denegado con código "access_denied"

  @rbac
  Scenario: Supervisor no puede otorgar prestaciones
    Given un sujeto autenticado con token "supervisor-full"
    When intenta ejecutar la capacidad "prestacion:otorgar"
    Then el acceso es denegado con código "access_denied"

  # ── Operador Pagos ──────────────────────────────────────────────────────────

  @smoke @rbac
  Scenario: Operador puede solicitar cierre mensual
    Given un sujeto autenticado con token "operador-pagos"
    When intenta ejecutar la capacidad "liquidacion:solicitar-cierre"
    Then el acceso es concedido

  @rbac
  Scenario: Operador puede calcular liquidaciones
    Given un sujeto autenticado con token "operador-pagos"
    When intenta ejecutar la capacidad "liquidacion:calcular"
    Then el acceso es concedido

  @rbac
  Scenario: Operador no puede aprobar cierre (evita auto-aprobación)
    Given un sujeto autenticado con token "operador-pagos"
    When intenta ejecutar la capacidad "liquidacion:aprobar-cierre"
    Then el acceso es denegado con código "access_denied"

  @rbac
  Scenario: Operador no puede otorgar prestaciones
    Given un sujeto autenticado con token "operador-pagos"
    When intenta ejecutar la capacidad "prestacion:otorgar"
    Then el acceso es denegado con código "access_denied"

  # ── Auditor ─────────────────────────────────────────────────────────────────

  @smoke @rbac
  Scenario: Auditor puede leer auditoría
    Given un sujeto autenticado con token "auditor"
    When intenta ejecutar la capacidad "auditoria:leer"
    Then el acceso es concedido

  @rbac
  Scenario: Auditor no puede otorgar prestaciones
    Given un sujeto autenticado con token "auditor"
    When intenta ejecutar la capacidad "prestacion:otorgar"
    Then el acceso es denegado con código "access_denied"

  @rbac
  Scenario: Auditor no puede calcular liquidaciones
    Given un sujeto autenticado con token "auditor"
    When intenta ejecutar la capacidad "liquidacion:calcular"
    Then el acceso es denegado con código "access_denied"

  @rbac
  Scenario: Auditor no puede aprobar cierre mensual
    Given un sujeto autenticado con token "auditor"
    When intenta ejecutar la capacidad "liquidacion:aprobar-cierre"
    Then el acceso es denegado con código "access_denied"

  # ── Admin Gobernanza ────────────────────────────────────────────────────────

  @rbac
  Scenario Outline: Admin Gobernanza tiene todas las capacidades críticas
    Given un sujeto autenticado con token "admin-gobernanza"
    When intenta ejecutar la capacidad "<capacidad>"
    Then el acceso es concedido

    Examples:
      | capacidad                      |
      | prestacion:otorgar             |
      | prestacion:denegar             |
      | prestacion:consultar           |
      | liquidacion:solicitar-cierre   |
      | liquidacion:aprobar-cierre     |
      | liquidacion:consultar          |
      | auditoria:leer                 |
      | rbac:administrar               |
      | agente:gestionar-sesion-dev    |

  # ── Matriz completa como tabla ──────────────────────────────────────────────

  @rbac
  Scenario Outline: Matriz completa de capacidades por rol
    Given un sujeto autenticado con token "<token>"
    When intenta ejecutar la capacidad "<capacidad>"
    Then el resultado de acceso es "<resultado>"

    Examples:
      | token            | capacidad                    | resultado |
      | analista-rm-norte | prestacion:otorgar           | concedido |
      | analista-rm-norte | prestacion:denegar           | concedido |
      | analista-rm-norte | prestacion:consultar         | concedido |
      | analista-rm-norte | liquidacion:aprobar-cierre   | denegado  |
      | analista-rm-norte | liquidacion:calcular         | denegado  |
      | analista-rm-norte | auditoria:leer               | denegado  |
      | supervisor-full   | liquidacion:aprobar-cierre   | concedido |
      | supervisor-full   | liquidacion:consultar        | concedido |
      | supervisor-full   | prestacion:consultar         | concedido |
      | supervisor-full   | liquidacion:calcular         | denegado  |
      | supervisor-full   | prestacion:otorgar           | denegado  |
      | supervisor-full   | auditoria:leer               | denegado  |
      | operador-pagos    | liquidacion:solicitar-cierre | concedido |
      | operador-pagos    | liquidacion:calcular         | concedido |
      | operador-pagos    | liquidacion:consultar        | concedido |
      | operador-pagos    | liquidacion:aprobar-cierre   | denegado  |
      | operador-pagos    | prestacion:otorgar           | denegado  |
      | operador-pagos    | auditoria:leer               | denegado  |
      | auditor           | auditoria:leer               | concedido |
      | auditor           | prestacion:otorgar           | denegado  |
      | auditor           | liquidacion:calcular         | denegado  |
      | auditor           | liquidacion:aprobar-cierre   | denegado  |
