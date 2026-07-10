# ADR-011 §3.4 — Relación de sujeto con recursos
# requireRelation(capability, resourceId) verifica orgUnit o assignedCaseIds

Feature: Control de acceso por relación de contexto
  Como motor de autorización RBAC
  Quiero que los sujetos sólo accedan a recursos dentro de su contexto organizacional
  Para que un analista de RM-Norte no pueda operar sobre casos de RM-Sur

  Background:
    Given el sistema opera en modo TEST_MODE=architecture

  # ── Acceso por orgUnit ──────────────────────────────────────────────────────

  @rbac
  Scenario: Analista accede a caso de su propia orgUnit
    Given un sujeto autenticado con token "analista-rm-norte"
    And existe el caso "caso-001" con orgUnit "RM-Norte"
    When intenta ejecutar "prestacion:otorgar" sobre el caso "caso-001"
    Then el acceso es concedido

  @rbac
  Scenario: Analista no puede acceder a caso de otra orgUnit
    Given un sujeto autenticado con token "analista-rm-norte"
    And existe el caso "caso-002" con orgUnit "RM-Sur"
    When intenta ejecutar "prestacion:otorgar" sobre el caso "caso-002"
    Then el acceso es denegado con código "relation_violation"

  @rbac
  Scenario: Supervisor con orgUnit wildcard accede a casos de cualquier región
    Given un sujeto autenticado con token "supervisor-full"
    And existe el caso "caso-003" con orgUnit "RM-Sur"
    When intenta ejecutar "prestacion:consultar" sobre el caso "caso-003"
    Then el acceso es concedido

  @rbac
  Scenario: relation_violation requiere que el sujeto tenga la capacidad base
    Given un sujeto autenticado con token "analista-rm-norte"
    And existe el caso "caso-004" con orgUnit "RM-Sur"
    When intenta ejecutar "liquidacion:calcular" sobre el caso "caso-004"
    Then el acceso es denegado con código "access_denied"
